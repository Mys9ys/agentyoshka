import type { FastifyInstance } from 'fastify';
import { toAgentProfile } from '../lib/agent-map.js';
import { getOrCreateDemoUser } from '../lib/demo-user.js';
import { prisma } from '../lib/prisma.js';
import type { Agent } from '@prisma/client';
import {
  effectiveBufferCap,
  effectiveCoinsPerHour,
  hardwareBonusesFromPurchases,
  tickRun,
} from '../lib/production.js';
import { productionSpeedupConfig, tickStatus } from '../lib/tick.js';
import { dateKeyFromDate } from '../lib/day-config.js';

async function syncRuns(agent: Agent, ownedIds: string[]) {
  const bonuses = hardwareBonusesFromPurchases(ownedIds);
  const runs = await prisma.productionRun.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: 'desc' },
  });

  let totalPending = 0;
  for (const run of runs) {
    const tick = tickRun(run, bonuses, new Date(), agent);
    if (tick.unclaimed !== run.unclaimed || tick.lastTickAt.getTime() !== run.lastTickAt.getTime()) {
      await prisma.productionRun.update({
        where: { id: run.id },
        data: { unclaimed: tick.unclaimed, lastTickAt: tick.lastTickAt },
      });
    }
    totalPending += tick.unclaimed;
  }

  const fresh = await prisma.productionRun.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: 'desc' },
  });

  return { runs: fresh, bonuses, totalPending };
}

function runToView(
  run: Awaited<ReturnType<typeof syncRuns>>['runs'][0],
  bonuses: ReturnType<typeof hardwareBonusesFromPurchases>,
  agent: Agent,
) {
  const cap = effectiveBufferCap(run, bonuses);
  const rate = effectiveCoinsPerHour(run, bonuses, agent);
  return {
    id: run.id,
    dateKey: run.dateKey,
    weekday: run.weekday,
    title: run.title,
    tagline: run.tagline,
    unclaimed: run.unclaimed,
    bufferCap: cap,
    coinsPerHour: rate,
    createdAt: run.createdAt.toISOString(),
  };
}

export async function productionRoutes(app: FastifyInstance) {
  app.get('/demo/production', async (req, reply) => {
    try {
      const { agent } = await getOrCreateDemoUser();
      const purchases = await prisma.agentPurchase.findMany({
        where: { agentId: agent.id },
        select: { itemId: true },
      });
      const ownedIds = purchases.map((p) => p.itemId);
      const { runs, bonuses, totalPending } = await syncRuns(agent, ownedIds);
      const tick = tickStatus(agent);

      return {
        ok: true,
        coins: agent.coins,
        totalPending,
        tick,
        bonuses: {
          productionMult: bonuses.productionMult,
          bufferCapBonus: bonuses.bufferCapBonus,
          coinsPerHourBonus: bonuses.coinsPerHourBonus,
          tickMult: tick.productionMult,
        },
        runs: runs.map((r) => runToView(r, bonuses, agent)),
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'База недоступна' });
    }
  });

  app.post<{ Body: { runId?: string } }>('/demo/production/collect', async (req, reply) => {
    const runId = req.body?.runId?.trim();

    try {
      const { agent } = await getOrCreateDemoUser();
      const purchases = await prisma.agentPurchase.findMany({
        where: { agentId: agent.id },
        select: { itemId: true },
      });
      const ownedIds = purchases.map((p) => p.itemId);
      const bonuses = hardwareBonusesFromPurchases(ownedIds);

      const result = await prisma.$transaction(async (tx) => {
        const runs = await tx.productionRun.findMany({
          where: runId ? { agentId: agent.id, id: runId } : { agentId: agent.id },
        });

        if (runId && runs.length === 0) {
          return { error: 'not_found' as const, collected: 0 };
        }

        let collected = 0;
        for (const run of runs) {
          const tick = tickRun(run, bonuses, new Date(), agent);
          const amount = tick.unclaimed;
          if (amount <= 0) continue;
          collected += amount;
          await tx.productionRun.update({
            where: { id: run.id },
            data: { unclaimed: 0, lastTickAt: tick.lastTickAt },
          });
        }

        if (collected <= 0) {
          return { error: 'empty' as const, collected: 0 };
        }

        const updated = await tx.agent.update({
          where: { id: agent.id },
          data: { coins: { increment: collected } },
        });

        return { error: null, collected, agent: updated };
      });

      if (result.error === 'not_found') {
        return reply.status(404).send({ ok: false, error: 'Слот не найден' });
      }
      if (result.error === 'empty') {
        return reply.status(400).send({ ok: false, error: 'Нечего собирать — подожди накопления' });
      }

      const freshAgent = result.agent!;
      const { runs, totalPending } = await syncRuns(freshAgent, ownedIds);

      return {
        ok: true,
        collected: result.collected,
        agent: toAgentProfile(freshAgent),
        coins: freshAgent.coins,
        totalPending,
        runs: runs.map((r) => runToView(r, bonuses, freshAgent)),
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'База недоступна' });
    }
  });

  app.post<{ Body: { hours?: number } }>('/demo/production/speedup', async (req, reply) => {
    const cfg = productionSpeedupConfig();
    const maxPer = cfg.maxHoursPerPurchase ?? 4;
    let hours = Math.floor(Number(req.body?.hours ?? 1));
    if (!Number.isFinite(hours) || hours < 1) hours = 1;
    hours = Math.min(hours, maxPer);

    const cost = hours * (cfg.coinCostPerHour ?? 8);
    const dateKey = dateKeyFromDate();

    try {
      const { agent } = await getOrCreateDemoUser();
      if (agent.coins < cost) {
        return reply.status(400).send({
          ok: false,
          error: 'Не хватает монет',
          need: cost,
          have: agent.coins,
        });
      }

      const usedToday = await prisma.dailyState.findMany({
        where: {
          agentId: agent.id,
          dateKey,
          eventId: { startsWith: 'speedup_' },
        },
      });
      const hoursUsed = usedToday.reduce((s, r) => s + (Number(r.choiceKey) || 0), 0);
      const dailyCap = cfg.dailyCapHours ?? 12;
      if (hoursUsed + hours > dailyCap) {
        return reply.status(429).send({
          ok: false,
          error: `Дневной лимит ускорения ${dailyCap} ч (уже ${hoursUsed})`,
        });
      }

      const purchases = await prisma.agentPurchase.findMany({
        where: { agentId: agent.id },
        select: { itemId: true },
      });
      const ownedIds = purchases.map((p) => p.itemId);
      const bonuses = hardwareBonusesFromPurchases(ownedIds);
      const ms = hours * 3_600_000;

      const updated = await prisma.$transaction(async (tx) => {
        const runs = await tx.productionRun.findMany({ where: { agentId: agent.id } });
        for (const run of runs) {
          const fakeNow = new Date(run.lastTickAt.getTime() + ms);
          const tick = tickRun(
            { ...run, lastTickAt: run.lastTickAt },
            bonuses,
            fakeNow,
            agent,
          );
          await tx.productionRun.update({
            where: { id: run.id },
            data: { unclaimed: tick.unclaimed, lastTickAt: new Date() },
          });
        }

        await tx.dailyState.create({
          data: {
            agentId: agent.id,
            dateKey,
            eventId: `speedup_${Date.now()}`,
            choiceKey: String(hours),
          },
        });

        return tx.agent.update({
          where: { id: agent.id },
          data: { coins: { decrement: cost } },
        });
      });

      const { runs, totalPending } = await syncRuns(updated, ownedIds);

      return {
        ok: true,
        hours,
        spent: cost,
        agent: toAgentProfile(updated),
        coins: updated.coins,
        totalPending,
        runs: runs.map((r) => runToView(r, bonuses, updated)),
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'База недоступна' });
    }
  });
}
