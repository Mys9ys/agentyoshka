import type { FastifyInstance } from 'fastify';
import { toAgentProfile } from '../lib/agent-map.js';
import { dateKeyFromDate } from '../lib/day-config.js';
import { getRequestAgent } from '../lib/auth.js';
import { findRelease, loadFeed } from '../lib/feed.js';
import { MINIGAME_MIN_SCORE } from '../lib/minigames-catalog.js';
import { applyDriftToAgent, driftForMinigame } from '../lib/personality.js';
import { prisma } from '../lib/prisma.js';

export async function feedRoutes(app: FastifyInstance) {
  app.get('/demo/feed', async (req, reply) => {
    try {
      const { agent } = await getRequestAgent(req);
      const feed = loadFeed();
      const dateKey = dateKeyFromDate();
      const visits = await prisma.dailyState.count({
        where: {
          agentId: agent.id,
          dateKey,
          eventId: { startsWith: 'feed_' },
        },
      });

      const played = await prisma.dailyState.findMany({
        where: {
          agentId: agent.id,
          dateKey,
          eventId: { startsWith: 'feed_' },
        },
        select: { eventId: true },
      });
      // eventId: feed_{releaseId}_{timestamp}
      const visitedReleaseIds = new Set(
        played
          .map((p) => {
            const raw = p.eventId.slice('feed_'.length);
            const lastUnd = raw.lastIndexOf('_');
            return lastUnd > 0 ? raw.slice(0, lastUnd) : raw;
          })
          .filter(Boolean),
      );

      return {
        ok: true,
        visitsToday: visits,
        visitsLeft: Math.max(0, feed.maxVisitsPerDay - visits),
        maxVisitsPerDay: feed.maxVisitsPerDay,
        reward: feed.visitReward,
        bots: feed.bots.map((bot) => ({
          id: bot.id,
          displayName: bot.displayName,
          grade: bot.grade,
          tagline: bot.tagline,
          skinTone: bot.skinTone,
          releases: bot.releases.map((r) => ({
            ...r,
            playedToday: visitedReleaseIds.has(r.id),
          })),
        })),
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'База недоступна' });
    }
  });

  app.post<{
    Body: { releaseId?: string; score?: number; won?: boolean };
  }>('/demo/feed/play', async (req, reply) => {
    const releaseId = req.body?.releaseId?.trim();
    const score = Number(req.body?.score ?? 0);
    const won = Boolean(req.body?.won ?? (Number.isFinite(score) && score > 0));

    if (!releaseId) {
      return reply.status(400).send({ error: 'releaseId обязателен' });
    }

    const found = findRelease(releaseId);
    if (!found) {
      return reply.status(404).send({ error: 'Релиз не найден' });
    }

    const minScore = MINIGAME_MIN_SCORE[found.release.minigameId] ?? 1;
    if (won && Number.isFinite(score) && score > 0 && score < minScore) {
      return reply.status(400).send({
        error: `Для награды нужно ≥ ${minScore}`,
        minScore,
      });
    }

    try {
      const { agent } = await getRequestAgent(req);
      const feed = loadFeed();
      const dateKey = dateKeyFromDate();

      const visits = await prisma.dailyState.count({
        where: {
          agentId: agent.id,
          dateKey,
          eventId: { startsWith: 'feed_' },
        },
      });
      if (visits >= feed.maxVisitsPerDay) {
        return reply.status(429).send({
          error: `Лимит визитов на сегодня (${feed.maxVisitsPerDay})`,
          visitsLeft: 0,
        });
      }

      const coins =
        feed.visitReward.baseCoins +
        (won ? feed.visitReward.bonusIfWin + (found.release.coinsTip ?? 0) : 0);

      const updated = await prisma.$transaction(async (tx) => {
        await tx.dailyState.create({
          data: {
            agentId: agent.id,
            dateKey,
            eventId: `feed_${releaseId}_${Date.now()}`,
            choiceKey: won ? `win:${Math.floor(score)}` : 'visit',
          },
        });
        return tx.agent.update({
          where: { id: agent.id },
          data: { coins: { increment: coins } },
        });
      });

      const drifted = won
        ? await applyDriftToAgent(updated, driftForMinigame())
        : updated;

      return {
        ok: true,
        releaseId,
        botId: found.bot.id,
        won,
        reward: { coins },
        agent: toAgentProfile(drifted),
        coins: drifted.coins,
        visitsLeft: Math.max(0, feed.maxVisitsPerDay - visits - 1),
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ error: 'База недоступна' });
    }
  });
}
