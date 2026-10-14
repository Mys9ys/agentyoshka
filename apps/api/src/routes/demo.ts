import type { FastifyInstance } from 'fastify';
import type { AgentProfile, TodayProgress } from '@agentyoshka/shared';
import { weekdayFromDate } from '../lib/calendar.js';
import { dateKeyFromDate, getDayConfig } from '../lib/day-config.js';
import { toAgentProfile } from '../lib/agent-map.js';
import { completeDailyEvent } from '../lib/daily-action.js';
import { getOrCreateDemoUser } from '../lib/demo-user.js';
import { prisma } from '../lib/prisma.js';
import { invalidateDayIntroReply } from '../lib/agent-reply.js';
import {
  applyDriftToAgent,
  driftForLesson,
  driftForMinigame,
} from '../lib/personality.js';

const demoAgentFallback: AgentProfile = {
  id: 'demo-offline',
  displayName: 'Агентёшка',
  baseSkinId: 'bear_cream',
  level: 1,
  cultureXp: 0,
  trainingGrade: 'G0',
  cultureTrack: 'neutral',
};

const MIN_CATCH_COINS_SCORE = 5;

function buildTodayProgress(
  dayConfig: ReturnType<typeof getDayConfig>,
  dateKey: string,
  daily: { choiceKey: string | null } | null,
): TodayProgress {
  const eventId = dayConfig.id ?? null;
  const choiceRaw = daily?.choiceKey;
  const choiceKey =
    choiceRaw === 'a' || choiceRaw === 'b' ? choiceRaw : null;

  return {
    dateKey,
    eventId,
    completed: Boolean(daily),
    choiceKey,
    hasLessonChoice: Boolean(dayConfig.lessonChoice),
    minigameId: dayConfig.minigame ?? null,
    hasMinigame: Boolean(dayConfig.minigame),
    minigameScore:
      choiceRaw && choiceRaw !== 'a' && choiceRaw !== 'b' ? Number(choiceRaw) || null : null,
  };
}

export async function demoRoutes(app: FastifyInstance) {
  app.get('/demo/agent', async (): Promise<{
    agent: AgentProfile;
    coins: number;
    source: string;
    today: TodayProgress;
    scenarioWeekday: string;
  }> => {
    const weekday = weekdayFromDate();
    const dayConfig = getDayConfig(weekday);
    const dateKey = dateKeyFromDate();
    const eventId = dayConfig.id ?? null;

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

      return {
        source: 'database',
        agent: toAgentProfile(agent),
        coins: agent.coins,
        today: buildTodayProgress(dayConfig, dateKey, daily),
        scenarioWeekday: weekday,
      };
    } catch {
      return {
        source: 'fallback',
        agent: demoAgentFallback,
        coins: 0,
        today: buildTodayProgress(dayConfig, dateKey, null),
        scenarioWeekday: weekday,
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
      const result = await completeDailyEvent({
        agent,
        weekday,
        dateKey,
        eventId,
        choiceKey: choice,
        extraAgentData: {
          cultureTrack: picked.track,
          scenarioDayKey: weekday,
        },
      });

      const afterLesson = await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } });
      const drifted = await applyDriftToAgent(afterLesson, driftForLesson(picked.track));
      await invalidateDayIntroReply(agent.id);

      return {
        ok: true,
        choiceKey: choice,
        track: picked.track,
        reward: result.reward,
        agent: toAgentProfile(drifted),
        coins: drifted.coins,
        today: {
          ...buildTodayProgress(dayConfig, dateKey, { choiceKey: choice }),
        },
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({
        error: 'База недоступна. Запусти Postgres (npm run db:up) и prisma migrate.',
      });
    }
  });

  app.post<{ Body: { minigameId?: string; score?: number } }>(
    '/demo/minigame-complete',
    async (req, reply) => {
      const minigameId = req.body?.minigameId?.trim();
      const score = Number(req.body?.score);

      if (!minigameId) {
        return reply.status(400).send({ error: 'minigameId обязателен' });
      }
      if (!Number.isFinite(score) || score < 0) {
        return reply.status(400).send({ error: 'score должен быть числом ≥ 0' });
      }

      const weekday = weekdayFromDate();
      const dayConfig = getDayConfig(weekday);
      const dateKey = dateKeyFromDate();
      const eventId = dayConfig.id;

      if (!dayConfig.minigame || dayConfig.minigame !== minigameId) {
        return reply.status(400).send({ error: 'Сегодня эта мини-игра недоступна в сценарии' });
      }

      const { MINIGAME_MIN_SCORE } = await import('../lib/minigames-catalog.js');
      const minNeeded = MINIGAME_MIN_SCORE[minigameId] ?? MIN_CATCH_COINS_SCORE;
      if (score < minNeeded) {
        return reply.status(400).send({
          error: `Нужно набрать хотя бы ${minNeeded}`,
          minScore: minNeeded,
        });
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
          return reply.status(409).send({ error: 'Ивент на сегодня уже завершён' });
        }

        const result = await completeDailyEvent({
          agent,
          weekday,
          dateKey,
          eventId,
          choiceKey: String(Math.floor(score)),
          minigameScore: Math.floor(score),
          extraAgentData: { scenarioDayKey: weekday },
        });

        const afterGame = await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } });
        const drifted = await applyDriftToAgent(afterGame, driftForMinigame());
        await invalidateDayIntroReply(agent.id);

        return {
          ok: true,
          minigameId,
          score,
          reward: result.reward,
          agent: toAgentProfile(drifted),
          coins: drifted.coins,
          today: buildTodayProgress(dayConfig, dateKey, {
            choiceKey: String(Math.floor(score)),
          }),
        };
      } catch (err) {
        req.log.error(err);
        return reply.status(503).send({
          error: 'База недоступна. Запусти Postgres и migrate.',
        });
      }
    },
  );

  app.post('/demo/daily-complete', async (req, reply) => {
    const weekday = weekdayFromDate();
    const dayConfig = getDayConfig(weekday);
    const dateKey = dateKeyFromDate();
    const eventId = dayConfig.id;

    if (!eventId) {
      return reply.status(500).send({ error: 'У дня календаря нет id' });
    }

    if (dayConfig.lessonChoice || dayConfig.minigame) {
      return reply.status(400).send({
        error: 'Сегодня завершение через урок или мини-игру',
      });
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
        return reply.status(409).send({ error: 'Ивент на сегодня уже завершён' });
      }

      const result = await completeDailyEvent({
        agent,
        weekday,
        dateKey,
        eventId,
        choiceKey: 'done',
        extraAgentData: { scenarioDayKey: weekday },
      });

      await invalidateDayIntroReply(agent.id);

      return {
        ok: true,
        reward: result.reward,
        agent: result.agent,
        coins: result.coins,
        today: buildTodayProgress(dayConfig, dateKey, { choiceKey: 'done' }),
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ error: 'База недоступна' });
    }
  });
}
