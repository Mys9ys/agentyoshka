import type { FastifyInstance } from 'fastify';
import { toAgentProfile } from '../lib/agent-map.js';
import { dateKeyFromDate } from '../lib/day-config.js';
import { getOrCreateDemoUser } from '../lib/demo-user.js';
import { prisma } from '../lib/prisma.js';
import { loadTickConfig } from '../lib/tick.js';

/** Заглушки IAP / rewarded ads — без реальных платежей и SDK рекламы. */
export async function monetizationRoutes(app: FastifyInstance) {
  app.get('/demo/monetization', async (req, reply) => {
    try {
      const { agent } = await getOrCreateDemoUser();
      const cfg = loadTickConfig().monetizationPlanned;
      const dateKey = dateKeyFromDate();
      const adRows = await prisma.dailyState.findMany({
        where: {
          agentId: agent.id,
          dateKey,
          eventId: { startsWith: 'ad_' },
        },
        select: { eventId: true },
      });
      const usedByAd = new Map<string, number>();
      for (const row of adRows) {
        // ad_{adId}_{ts}
        const raw = row.eventId.slice('ad_'.length);
        const lastUnd = raw.lastIndexOf('_');
        const adId = lastUnd > 0 ? raw.slice(0, lastUnd) : raw;
        usedByAd.set(adId, (usedByAd.get(adId) ?? 0) + 1);
      }

      return {
        ok: true,
        iapCoinPacks: cfg?.iapCoinPacks ?? [],
        rewardedAds: (cfg?.rewardedAds ?? []).map((ad) => ({
          ...ad,
          usedToday: usedByAd.get(ad.id) ?? 0,
          left: Math.max(0, (ad.dailyCap ?? 3) - (usedByAd.get(ad.id) ?? 0)),
        })),
        note: 'Демо: реклама и покупки симулируются, денег не списываем.',
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'База недоступна' });
    }
  });

  app.post<{ Body: { adId?: string } }>('/demo/ads/reward', async (req, reply) => {
    const adId = req.body?.adId?.trim() || 'ad_double_collect';
    const cfg = loadTickConfig().monetizationPlanned?.rewardedAds ?? [];
    const ad = cfg.find((a) => a.id === adId);
    if (!ad) {
      return reply.status(404).send({ error: 'Реклама не в каталоге' });
    }

    const dailyCap = ad.dailyCap ?? 3;
    const dateKey = dateKeyFromDate();

    try {
      const { agent } = await getOrCreateDemoUser();
      const used = await prisma.dailyState.count({
        where: {
          agentId: agent.id,
          dateKey,
          eventId: { startsWith: `ad_${adId}_` },
        },
      });
      if (used >= dailyCap) {
        return reply.status(429).send({
          error: `Лимит «${ad.label}» на сегодня`,
          left: 0,
        });
      }

      // Симуляция просмотра: +12 монет или ускорение отметим как монеты
      const coins = adId === 'ad_speedup_craft' ? 10 : 12;

      const updated = await prisma.$transaction(async (tx) => {
        await tx.dailyState.create({
          data: {
            agentId: agent.id,
            dateKey,
            eventId: `ad_${adId}_${Date.now()}`,
            choiceKey: 'simulated',
          },
        });
        return tx.agent.update({
          where: { id: agent.id },
          data: { coins: { increment: coins } },
        });
      });

      return {
        ok: true,
        simulated: true,
        adId,
        label: ad.label,
        reward: { coins },
        agent: toAgentProfile(updated),
        coins: updated.coins,
        left: Math.max(0, dailyCap - used - 1),
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ error: 'База недоступна' });
    }
  });

  app.post<{ Body: { packId?: string } }>('/demo/iap/grant', async (req, reply) => {
    const packId = req.body?.packId?.trim() || 'coins_small';
    const packs = loadTickConfig().monetizationPlanned?.iapCoinPacks ?? [];
    const pack = packs.find((p) => p.id === packId);
    if (!pack) {
      return reply.status(404).send({ error: 'Пакет не найден' });
    }

    const coins = packId === 'coins_medium' ? 200 : 80;

    try {
      const { agent } = await getOrCreateDemoUser();
      const dateKey = dateKeyFromDate();
      const updated = await prisma.$transaction(async (tx) => {
        await tx.dailyState.create({
          data: {
            agentId: agent.id,
            dateKey,
            eventId: `iap_${packId}_${Date.now()}`,
            choiceKey: 'demo_grant',
          },
        });
        return tx.agent.update({
          where: { id: agent.id },
          data: { coins: { increment: coins } },
        });
      });

      return {
        ok: true,
        simulated: true,
        packId,
        label: pack.label,
        reward: { coins },
        agent: toAgentProfile(updated),
        coins: updated.coins,
        note: 'Демо-выдача без оплаты. Позже — стор.',
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ error: 'База недоступна' });
    }
  });
}
