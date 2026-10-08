import type { FastifyInstance } from 'fastify';
import type { AgentProfile } from '@agentyoshka/shared';
import { weekdayFromDate } from '../lib/calendar.js';
import {
  dateKeyFromDate,
  getDayConfig,
  trainingGradeForXp,
  type DayReward,
} from '../lib/day-config.js';
import { toAgentProfile } from '../lib/agent-map.js';
import { getOrCreateDemoUser } from '../lib/demo-user.js';
import { prisma } from '../lib/prisma.js';

const demoAgentFallback: AgentProfile = {
  id: 'demo-offline',
  displayName: 'Агентёшка',
  baseSkinId: 'bear_cream',
  level: 1,
  cultureXp: 0,
  trainingGrade: 'G0',
  cultureTrack: 'neutral',
};

export type TodayProgress = {
  dateKey: string;
  eventId: string | null;
  completed: boolean;
  choiceKey: 'a' | 'b' | null;
  hasLessonChoice: boolean;
};

function applyReward(base: { cultureXp: number; coins: number }, reward: DayReward | undefined) {
  return {
    cultureXp: base.cultureXp + (reward?.cultureXp ?? 0),
    coins: base.coins + (reward?.coins ?? 0),
  };
}

export async function demoRoutes(app: FastifyInstance) {
  app.get('/demo/agent', async (): Promise<{
    agent: AgentProfile;
    coins: number;
    source: string;
    today: TodayProgress;
  }> => {
    const weekday = weekdayFromDate();
    const dayConfig = getDayConfig(weekday);
    const dateKey = dateKeyFromDate();
    const eventId = dayConfig.id ?? null;
    const hasLessonChoice = Boolean(dayConfig.lessonChoice);

    try {
      const { agent } = await getOrCreateDemoUser();

      let daily = null;
      if (eventId) {
        daily = await prisma.dailyState.findUnique({
          where: {
            agentId_dateKey_eventId: {
              agentId: agent.id,
              dateKey,
              eventId,
            },
          },
        });
      }

      const choiceKey =
        daily?.choiceKey === 'a' || daily?.choiceKey === 'b' ? daily.choiceKey : null;

      return {
        source: 'database',
        agent: toAgentProfile(agent),
        coins: agent.coins,
        today: {
          dateKey,
          eventId,
          completed: Boolean(daily),
          choiceKey,
          hasLessonChoice,
        },
      };
    } catch {
      return {
        source: 'fallback',
        agent: demoAgentFallback,
        coins: 0,
        today: {
          dateKey,
          eventId,
          completed: false,
          choiceKey: null,
          hasLessonChoice,
        },
      };
    }
  });

  app.post<{ Body: { choice?: string } }>('/demo/lesson-choice', async (req, reply) => {
    const choice = req.body?.choice;
    if (choice !== 'a' && choice !== 'b') {
      return reply.status(400).send({ error: 'choice must be "a" or "b"' });
    }

    const weekday = weekdayFromDate();
    const dayConfig = getDayConfig(weekday);
    const dateKey = dateKeyFromDate();
    const eventId = dayConfig.id;

    if (!dayConfig.lessonChoice) {
      return reply.status(400).send({ error: 'Сегодня нет выбора урока в сценарии' });
    }

    if (!eventId) {
      return reply.status(500).send({ error: 'У дня календаря нет id' });
    }

    try {
      const { agent } = await getOrCreateDemoUser();

      const existing = await prisma.dailyState.findUnique({
        where: {
          agentId_dateKey_eventId: {
            agentId: agent.id,
            dateKey,
            eventId,
          },
        },
      });

      if (existing) {
        return reply.status(409).send({
          error: 'Урок на сегодня уже выбран',
          choiceKey: existing.choiceKey,
        });
      }

      const picked = dayConfig.lessonChoice[choice];
      const afterReward = applyReward(
        { cultureXp: agent.cultureXp, coins: agent.coins },
        dayConfig.reward,
      );
      const trainingGrade = trainingGradeForXp(afterReward.cultureXp);

      const updated = await prisma.$transaction(async (tx) => {
        await tx.dailyState.create({
          data: {
            agentId: agent.id,
            dateKey,
            eventId,
            choiceKey: choice,
          },
        });

        return tx.agent.update({
          where: { id: agent.id },
          data: {
            cultureTrack: picked.track,
            cultureXp: afterReward.cultureXp,
            coins: afterReward.coins,
            trainingGrade,
            scenarioDayKey: weekday,
          },
        });
      });

      return {
        ok: true,
        choiceKey: choice,
        track: picked.track,
        reward: dayConfig.reward ?? {},
        agent: toAgentProfile(updated),
        coins: updated.coins,
        today: {
          dateKey,
          eventId,
          completed: true,
          choiceKey: choice,
          hasLessonChoice: true,
        } satisfies TodayProgress,
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({
        error: 'База недоступна. Запусти Postgres (npm run db:up) и prisma migrate.',
      });
    }
  });
}
