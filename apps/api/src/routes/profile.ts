import type { FastifyInstance } from 'fastify';
import { loadCalendar } from '../lib/calendar.js';
import { toAgentProfile } from '../lib/agent-map.js';
import { getOrCreateDemoUser } from '../lib/demo-user.js';
import { prisma } from '../lib/prisma.js';
import { getShopItem, loadShop } from '../lib/shop.js';
import { buildVoiceProfile } from '../lib/personality.js';
import { buildTechTree } from '../lib/tech-tree.js';

const STARTER_SKIN = 'bear_cream';

export async function profileRoutes(app: FastifyInstance) {
  app.get('/demo/profile', async (req, reply) => {
    try {
      const { agent } = await getOrCreateDemoUser();
      const calendar = loadCalendar();
      const purchases = await prisma.agentPurchase.findMany({
        where: { agentId: agent.id },
        orderBy: { purchasedAt: 'asc' },
      });

      const skinLabel =
        calendar.baseSkins.find((s) => s.id === agent.baseSkinId)?.label ?? agent.baseSkinId;

      const modules = purchases
        .map((p) => {
          const item = getShopItem(p.itemId);
          if (!item) return null;
          return {
            itemId: item.id,
            kind: item.kind,
            label: item.label,
            description: item.description,
            purchasedAt: p.purchasedAt.toISOString(),
            equipped: item.kind === 'skin' && item.skinId === agent.baseSkinId,
            effect: item.effect ?? null,
          };
        })
        .filter(Boolean);

      const ownedSkins = modules.filter((m) => m!.kind === 'skin');
      const upgrades = modules.filter((m) => m!.kind === 'upgrade');

      const shopSkins = loadShop().items.filter((i) => i.kind === 'skin');
      const ownedSkinIds = new Set(ownedSkins.map((s) => s!.itemId));
      const wardrobe = [
        {
          skinId: STARTER_SKIN,
          label:
            calendar.baseSkins.find((s) => s.id === STARTER_SKIN)?.label ?? 'Кремовый мишка',
          owned: true,
          equipped: agent.baseSkinId === STARTER_SKIN,
        },
        ...shopSkins.map((item) => ({
          skinId: item.skinId!,
          label: item.label,
          owned: ownedSkinIds.has(item.id),
          equipped: item.skinId === agent.baseSkinId,
        })),
      ];

      const trackBio: Record<string, string> = {
        neutral: 'Базовая прошивка — ещё не выбран литературный трек.',
        pushkin: 'Трек Пушкина — лёгкость, рифма, короткие ясные реплики.',
        dostoevsky: 'Трек Достоевского — вопросы, глубина, паузы в диалоге.',
      };

      const ownedIds = purchases.map((p) => p.itemId);

      return {
        agent: toAgentProfile(agent),
        coins: agent.coins,
        skin: { id: agent.baseSkinId, label: skinLabel },
        wardrobe,
        upgrades,
        modules,
        techBranches: buildTechTree(agent, ownedIds, agent.coins),
        bio: trackBio[agent.cultureTrack] ?? trackBio.neutral,
        voice: buildVoiceProfile(agent),
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ error: 'База недоступна' });
    }
  });
}
