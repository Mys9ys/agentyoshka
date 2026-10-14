import type { FastifyInstance } from 'fastify';
import { getRequestAgent } from '../lib/auth.js';
import { buildMinigamesList, catalogStats } from '../lib/minigames-catalog.js';
import { computeMachineStats, machineComponentsView } from '../lib/machine.js';
import { prisma } from '../lib/prisma.js';
import { tickStatus } from '../lib/tick.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const tickPath = join(here, '../../../../packages/content/onboarding-tick.yaml');

export async function machineRoutes(app: FastifyInstance) {
  app.get('/demo/machine', async (req, reply) => {
    try {
      const { agent } = await getRequestAgent(req);
      const purchases = await prisma.agentPurchase.findMany({
        where: { agentId: agent.id },
        select: { itemId: true },
      });
      const ownedIds = purchases.map((p) => p.itemId);
      const stats = computeMachineStats(ownedIds);
      const components = machineComponentsView(stats);
      const minigames = buildMinigamesList(stats);
      const catalog = catalogStats();

      const monetization = YAML.parse(readFileSync(tickPath, 'utf8')).monetizationPlanned;

      return {
        ok: true,
        tick: tickStatus(agent),
        stats,
        components,
        minigames,
        catalog,
        monetizationPlanned: monetization,
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'База недоступна' });
    }
  });
}
