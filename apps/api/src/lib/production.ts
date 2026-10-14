import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import type { ProductionRun } from '@prisma/client';
import type { Weekday } from '@agentyoshka/shared';
import type { Prisma } from '@prisma/client';
import { getShopItem, loadShop } from './shop.js';
import { tickProductionMult } from './tick.js';
import type { Agent } from '@prisma/client';

const here = dirname(fileURLToPath(import.meta.url));
const templatesPath = join(here, '../../../../packages/content/production-templates.yaml');

type TemplatesFile = {
  byWeekday: Record<
    Weekday,
    {
      templateId: string;
      title: string;
      tagline: string;
      baseCoinsPerHour: number;
      bufferCap: number;
    }
  >;
  saturdayScoreBonusPerCoin: number;
};

let templatesCached: TemplatesFile | null = null;

export function loadProductionTemplates(): TemplatesFile {
  if (!templatesCached) {
    templatesCached = YAML.parse(readFileSync(templatesPath, 'utf8')) as TemplatesFile;
  }
  return templatesCached;
}

export type HardwareBonuses = {
  productionMult: number;
  bufferCapBonus: number;
  coinsPerHourBonus: number;
};

export function hardwareBonusesFromPurchases(ownedItemIds: string[]): HardwareBonuses {
  let productionMult = 1;
  let bufferCapBonus = 0;
  let coinsPerHourBonus = 0;

  for (const id of ownedItemIds) {
    const item = getShopItem(id);
    if (!item?.effect) continue;
    const e = item.effect as {
      productionMult?: number;
      bufferCapBonus?: number;
      coinsPerHourBonus?: number;
    };
    if (typeof e.productionMult === 'number') {
      productionMult += e.productionMult;
    }
    if (typeof e.bufferCapBonus === 'number') {
      bufferCapBonus += e.bufferCapBonus;
    }
    if (typeof e.coinsPerHourBonus === 'number') {
      coinsPerHourBonus += e.coinsPerHourBonus;
    }
  }

  return { productionMult, bufferCapBonus, coinsPerHourBonus };
}

const MS_HOUR = 3_600_000;

export function effectiveCoinsPerHour(
  run: ProductionRun,
  bonuses: HardwareBonuses,
  agent?: Agent,
): number {
  const base = run.baseCoinsPerHour + run.bonusCoinsPerHour + bonuses.coinsPerHourBonus;
  const tickMult = agent ? tickProductionMult(agent) : 1;
  return Math.max(1, Math.round(base * bonuses.productionMult * tickMult));
}

export function effectiveBufferCap(run: ProductionRun, bonuses: HardwareBonuses): number {
  return run.baseBufferCap + bonuses.bufferCapBonus;
}

export function tickRun(
  run: ProductionRun,
  bonuses: HardwareBonuses,
  now = new Date(),
  agent?: Agent,
): { unclaimed: number; lastTickAt: Date } {
  const elapsed = now.getTime() - run.lastTickAt.getTime();
  if (elapsed <= 0) {
    return { unclaimed: run.unclaimed, lastTickAt: run.lastTickAt };
  }

  const rate = effectiveCoinsPerHour(run, bonuses, agent);
  const cap = effectiveBufferCap(run, bonuses);
  const gained = Math.floor((elapsed / MS_HOUR) * rate);
  const unclaimed = Math.min(cap, run.unclaimed + gained);

  return { unclaimed, lastTickAt: now };
}

export async function spawnProductionRun(
  tx: Prisma.TransactionClient,
  opts: {
    agentId: string;
    weekday: Weekday;
    dateKey: string;
    eventId: string;
    minigameScore?: number;
  },
): Promise<ProductionRun | null> {
  const tpl = loadProductionTemplates().byWeekday[opts.weekday];
  if (!tpl) return null;

  let bonusCoinsPerHour = 0;
  if (opts.weekday === 'saturday' && opts.minigameScore != null) {
    const per = loadProductionTemplates().saturdayScoreBonusPerCoin ?? 0.15;
    bonusCoinsPerHour = Math.floor(opts.minigameScore * per);
  }

  try {
    return await tx.productionRun.create({
      data: {
        agentId: opts.agentId,
        dateKey: opts.dateKey,
        eventId: opts.eventId,
        weekday: opts.weekday,
        templateId: tpl.templateId,
        title: tpl.title,
        tagline: tpl.tagline,
        baseCoinsPerHour: tpl.baseCoinsPerHour,
        baseBufferCap: tpl.bufferCap,
        bonusCoinsPerHour,
      },
    });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'P2002') return null;
    throw e;
  }
}

export function listHardwareBranchLabel(): string {
  const branch = loadShop().branches.find((b) => b.id === 'hardware');
  return branch?.label ?? 'Железо';
}
