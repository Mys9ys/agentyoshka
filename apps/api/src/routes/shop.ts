import type { FastifyInstance } from 'fastify';
import { toAgentProfile } from '../lib/agent-map.js';
import { trainingGradeForXp } from '../lib/day-config.js';
import { getOrCreateDemoUser } from '../lib/demo-user.js';
import { prisma } from '../lib/prisma.js';
import { getShopItem, gradeAtLeast, loadShop } from '../lib/shop.js';
import { invalidateDayIntroReply } from '../lib/agent-reply.js';
import { applyDriftToAgent, driftForShopItem } from '../lib/personality.js';
import { buildTechTree, missingRequirements, nodeStatus } from '../lib/tech-tree.js';

const STARTER_SKIN = 'bear_cream';

export async function shopRoutes(app: FastifyInstance) {
  app.get('/demo/shop', async (req, reply) => {
    try {
      const { agent } = await getOrCreateDemoUser();
      const purchases = await prisma.agentPurchase.findMany({
        where: { agentId: agent.id },
        select: { itemId: true },
      });
      const ownedIds = purchases.map((p) => p.itemId);
      const techBranches = buildTechTree(agent, ownedIds, agent.coins);

      return {
        coins: agent.coins,
        agent: toAgentProfile(agent),
        techBranches,
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ error: 'База недоступна' });
    }
  });

  app.post<{ Body: { itemId?: string } }>('/demo/shop/purchase', async (req, reply) => {
    const itemId = req.body?.itemId?.trim();
    if (!itemId) {
      return reply.status(400).send({ error: 'itemId обязателен' });
    }

    const item = getShopItem(itemId);
    if (!item) {
      return reply.status(404).send({ error: 'Товар не найден' });
    }

    try {
      const { agent } = await getOrCreateDemoUser();

      const purchases = await prisma.agentPurchase.findMany({
        where: { agentId: agent.id },
        select: { itemId: true },
      });
      const ownedIds = new Set(purchases.map((p) => p.itemId));

      const existing = await prisma.agentPurchase.findUnique({
        where: { agentId_itemId: { agentId: agent.id, itemId } },
      });
      if (existing) {
        return reply.status(409).send({ error: 'Уже куплено' });
      }

      const missing = missingRequirements(item, ownedIds);
      if (missing.length > 0) {
        const labels = missing.map((id) => getShopItem(id)?.label ?? id).join(', ');
        return reply.status(400).send({ error: `Сначала изучи: ${labels}` });
      }

      if (item.minGrade && !gradeAtLeast(agent.trainingGrade, item.minGrade)) {
        return reply.status(400).send({ error: `Нужен грейд ${item.minGrade}` });
      }

      const { status } = nodeStatus(item, ownedIds, agent, agent.baseSkinId);
      if (status === 'locked') {
        return reply.status(400).send({ error: 'Технология пока недоступна' });
      }

      if (agent.coins < item.price) {
        return reply.status(400).send({
          error: 'Не хватает монет',
          need: item.price,
          have: agent.coins,
        });
      }

      let cultureXp = agent.cultureXp;
      let level = agent.level;
      let baseSkinId = agent.baseSkinId;

      if (item.kind === 'skin' && item.skinId) {
        baseSkinId = item.skinId;
      }
      if (item.kind === 'upgrade' && item.effect) {
        cultureXp += item.effect.cultureXp ?? 0;
        level += item.effect.level ?? 0;
      }

      const trainingGrade = trainingGradeForXp(cultureXp);

      const updated = await prisma.$transaction(async (tx) => {
        await tx.agentPurchase.create({
          data: { agentId: agent.id, itemId: item.id },
        });

        return tx.agent.update({
          where: { id: agent.id },
          data: {
            coins: agent.coins - item.price,
            cultureXp,
            level,
            trainingGrade,
            baseSkinId,
          },
        });
      });

      const drifted = await applyDriftToAgent(updated, driftForShopItem(item.id));
      await invalidateDayIntroReply(agent.id);
      const ownedAfter = [...ownedIds, item.id];
      return {
        ok: true,
        itemId: item.id,
        spent: item.price,
        agent: toAgentProfile(drifted),
        coins: drifted.coins,
        techBranches: buildTechTree(drifted, ownedAfter, drifted.coins),
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ error: 'База недоступна' });
    }
  });

  app.post<{ Body: { skinId?: string } }>('/demo/shop/equip', async (req, reply) => {
    const skinId = req.body?.skinId?.trim();
    if (!skinId) {
      return reply.status(400).send({ error: 'skinId обязателен' });
    }

    try {
      const { agent } = await getOrCreateDemoUser();

      if (skinId === STARTER_SKIN) {
        const updated = await prisma.agent.update({
          where: { id: agent.id },
          data: { baseSkinId: STARTER_SKIN },
        });
        return { ok: true, agent: toAgentProfile(updated) };
      }

      const skinItem = loadShop().items.find((i) => i.kind === 'skin' && i.skinId === skinId);

      if (!skinItem) {
        return reply.status(404).send({ error: 'Скин не в каталоге' });
      }

      const owned = await prisma.agentPurchase.findUnique({
        where: { agentId_itemId: { agentId: agent.id, itemId: skinItem.id } },
      });
      if (!owned) {
        return reply.status(400).send({ error: 'Сначала исследуй этот слой' });
      }

      const updated = await prisma.agent.update({
        where: { id: agent.id },
        data: { baseSkinId: skinId },
      });

      return { ok: true, agent: toAgentProfile(updated) };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ error: 'База недоступна' });
    }
  });
}
