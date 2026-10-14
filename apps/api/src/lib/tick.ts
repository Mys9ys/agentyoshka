import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import type { Agent } from '@prisma/client';

const here = dirname(fileURLToPath(import.meta.url));
const tickPath = join(here, '../../../../packages/content/onboarding-tick.yaml');

type TickFile = {
  tick: {
    label: string;
    durationDays: number;
    productionMultByLifeDay: number[];
    tagline: string;
  };
  loginStreak: {
    cycleAfterDay: number;
    rewards: {
      day: number;
      coins: number;
      label: string;
      hardwareDrop?: string;
    }[];
  };
  monetizationPlanned?: {
    iapCoinPacks?: { id: string; label: string; note?: string }[];
    rewardedAds?: { id: string; label: string; dailyCap?: number }[];
    productionSpeedup?: {
      coinCostPerHour: number;
      maxHoursPerPurchase?: number;
      dailyCapHours?: number;
      note?: string;
    };
  };
  freeArcade?: {
    maxPlaysPerDay: number;
    baseCoins: number;
    coinsPerScorePoint: number;
    maxCoinsReward: number;
  };
};

let cached: TickFile | null = null;

export function loadTickConfig(): TickFile {
  if (!cached) {
    cached = YAML.parse(readFileSync(tickPath, 'utf8')) as TickFile;
  }
  return cached;
}

export function agentLifeDay(agent: Agent, now = new Date()): number {
  const ms = now.getTime() - agent.createdAt.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function tickProductionMult(agent: Agent, now = new Date()): number {
  const cfg = loadTickConfig().tick;
  const lifeDay = agentLifeDay(agent, now);
  if (lifeDay >= cfg.durationDays) return 1;
  const row = cfg.productionMultByLifeDay[lifeDay];
  return typeof row === 'number' && row > 0 ? row : 1;
}

export function tickStatus(agent: Agent, now = new Date()) {
  const cfg = loadTickConfig().tick;
  const lifeDay = agentLifeDay(agent, now);
  const active = lifeDay < cfg.durationDays;
  const mult = tickProductionMult(agent, now);
  return {
    label: cfg.label,
    tagline: cfg.tagline,
    active,
    lifeDay: lifeDay + 1,
    durationDays: cfg.durationDays,
    productionMult: mult,
  };
}

export function loginRewardForStreakDay(streakDay: number) {
  const rewards = loadTickConfig().loginStreak.rewards;
  const cycle = loadTickConfig().loginStreak.cycleAfterDay;
  const idx = ((streakDay - 1) % cycle + cycle) % cycle;
  return rewards[idx] ?? rewards[0]!;
}

export function loginRewardTable() {
  return loadTickConfig().loginStreak.rewards;
}

export function freeArcadeConfig() {
  return (
    loadTickConfig().freeArcade ?? {
      maxPlaysPerDay: 5,
      baseCoins: 5,
      coinsPerScorePoint: 1,
      maxCoinsReward: 20,
    }
  );
}

export function productionSpeedupConfig() {
  return (
    loadTickConfig().monetizationPlanned?.productionSpeedup ?? {
      coinCostPerHour: 8,
      maxHoursPerPurchase: 4,
      dailyCapHours: 12,
    }
  );
}

/** Сброс кэша YAML (после правок контента в dev). */
export function clearTickCache() {
  cached = null;
}
