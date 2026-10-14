import type { Weekday } from '@agentyoshka/shared';
import type { Agent } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  applyReward,
  getDayConfig,
  trainingGradeForXp,
  type DayReward,
} from './day-config.js';
import { toAgentProfile } from './agent-map.js';
import { spawnProductionRun } from './production.js';

export async function completeDailyEvent(opts: {
  agent: Agent;
  weekday: Weekday;
  dateKey: string;
  eventId: string;
  choiceKey?: string | null;
  reward?: DayReward;
  minigameScore?: number;
  extraAgentData?: Partial<{
    cultureTrack: string;
    scenarioDayKey: string;
  }>;
}) {
  const dayConfig = getDayConfig(opts.weekday);
  const reward = opts.reward ?? dayConfig.reward;
  const afterReward = applyReward(
    { cultureXp: opts.agent.cultureXp, coins: opts.agent.coins },
    reward,
  );
  const trainingGrade = trainingGradeForXp(afterReward.cultureXp);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.dailyState.create({
      data: {
        agentId: opts.agent.id,
        dateKey: opts.dateKey,
        eventId: opts.eventId,
        choiceKey: opts.choiceKey ?? null,
      },
    });

    await spawnProductionRun(tx, {
      agentId: opts.agent.id,
      weekday: opts.weekday,
      dateKey: opts.dateKey,
      eventId: opts.eventId,
      minigameScore: opts.minigameScore,
    });

    return tx.agent.update({
      where: { id: opts.agent.id },
      data: {
        cultureXp: afterReward.cultureXp,
        coins: afterReward.coins,
        trainingGrade,
        scenarioDayKey: opts.extraAgentData?.scenarioDayKey ?? opts.weekday,
        ...(opts.extraAgentData?.cultureTrack
          ? { cultureTrack: opts.extraAgentData.cultureTrack }
          : {}),
      },
    });
  });

  return {
    agent: toAgentProfile(updated),
    coins: updated.coins,
    reward: reward ?? {},
  };
}
