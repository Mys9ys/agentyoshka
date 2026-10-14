import type { FastifyInstance } from 'fastify';
import { toAgentProfile } from '../lib/agent-map.js';
import { dateKeyFromDate } from '../lib/day-config.js';
import { getOrCreateDemoUser } from '../lib/demo-user.js';
import { computeMachineStats } from '../lib/machine.js';
import {
  buildMinigamesList,
  getCatalogGame,
  MINIGAME_MIN_SCORE,
} from '../lib/minigames-catalog.js';
import { applyDriftToAgent, driftForMinigame } from '../lib/personality.js';
import { prisma } from '../lib/prisma.js';
import { freeArcadeConfig } from '../lib/tick.js';
import { machineMeetsRequirement } from '../lib/machine.js';

export async function minigamesRoutes(app: FastifyInstance) {
  app.get('/demo/minigames', async (req, reply) => {
    try {
      const { agent } = await getOrCreateDemoUser();
      const purchases = await prisma.agentPurchase.findMany({
        where: { agentId: agent.id },
        select: { itemId: true },
      });
      const stats = computeMachineStats(purchases.map((p) => p.itemId));
      const dateKey = dateKeyFromDate();
      const plays = await prisma.dailyState.count({
        where: {
          agentId: agent.id,
          dateKey,
          eventId: { startsWith: 'free_arcade_' },
        },
      });
      const cfg = freeArcadeConfig();

      return {
        ok: true,
        playsToday: plays,
        playsLeft: Math.max(0, cfg.maxPlaysPerDay - plays),
        maxPlaysPerDay: cfg.maxPlaysPerDay,
        games: buildMinigamesList(stats).filter((g) => g.implemented),
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'База недоступна' });
    }
  });

  app.post<{ Body: { minigameId?: string; score?: number } }>(
    '/demo/minigame-play',
    async (req, reply) => {
      const minigameId = req.body?.minigameId?.trim();
      const score = Number(req.body?.score);

      if (!minigameId) {
        return reply.status(400).send({ error: 'minigameId обязателен' });
      }
      if (!Number.isFinite(score) || score < 0) {
        return reply.status(400).send({ error: 'score должен быть числом ≥ 0' });
      }

      const game = getCatalogGame(minigameId);
      if (!game || !game.implemented) {
        return reply.status(404).send({ error: 'Игра ещё не готова у мишки' });
      }

      const minScore = MINIGAME_MIN_SCORE[minigameId] ?? 1;
      if (score < minScore) {
        return reply.status(400).send({
          error: `Нужно набрать хотя бы ${minScore}`,
          minScore,
        });
      }

      try {
        const { agent } = await getOrCreateDemoUser();
        const purchases = await prisma.agentPurchase.findMany({
          where: { agentId: agent.id },
          select: { itemId: true },
        });
        const stats = computeMachineStats(purchases.map((p) => p.itemId));
        if (!machineMeetsRequirement(stats, game.requires)) {
          return reply.status(400).send({ error: 'Не хватает железа на сервере' });
        }

        const dateKey = dateKeyFromDate();
        const cfg = freeArcadeConfig();
        const plays = await prisma.dailyState.count({
          where: {
            agentId: agent.id,
            dateKey,
            eventId: { startsWith: 'free_arcade_' },
          },
        });
        if (plays >= cfg.maxPlaysPerDay) {
          return reply.status(429).send({
            error: `Лимит свободной аркады на сегодня (${cfg.maxPlaysPerDay})`,
            playsLeft: 0,
          });
        }

        const reward = Math.min(
          cfg.maxCoinsReward,
          cfg.baseCoins + Math.floor(score) * cfg.coinsPerScorePoint,
        );

        const updated = await prisma.$transaction(async (tx) => {
          await tx.dailyState.create({
            data: {
              agentId: agent.id,
              dateKey,
              eventId: `free_arcade_${Date.now()}`,
              choiceKey: `${minigameId}:${Math.floor(score)}`,
            },
          });
          return tx.agent.update({
            where: { id: agent.id },
            data: { coins: { increment: reward } },
          });
        });

        const drifted = await applyDriftToAgent(updated, driftForMinigame());

        return {
          ok: true,
          minigameId,
          score: Math.floor(score),
          reward: { coins: reward },
          agent: toAgentProfile(drifted),
          coins: drifted.coins,
          playsLeft: Math.max(0, cfg.maxPlaysPerDay - plays - 1),
        };
      } catch (err) {
        req.log.error(err);
        return reply.status(503).send({ error: 'База недоступна' });
      }
    },
  );
}
