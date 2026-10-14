import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import type { MachineStats } from './machine.js';
import { machineMeetsRequirement } from './machine.js';

const here = dirname(fileURLToPath(import.meta.url));
const catalogPath = join(here, '../../../../packages/content/minigames-catalog.yaml');

type CatalogFile = {
  games: {
    id: string;
    title: string;
    tagline: string;
    implemented: boolean;
    calendarSlot?: string;
    requires: { ramGb?: number; gpuTier?: number; ssdGb?: number; hddGb?: number };
  }[];
};

let cached: CatalogFile | null = null;

export function loadMinigamesCatalog(): CatalogFile {
  if (!cached) {
    cached = YAML.parse(readFileSync(catalogPath, 'utf8')) as CatalogFile;
  }
  return cached;
}

export function buildMinigamesList(stats: MachineStats) {
  return loadMinigamesCatalog().games.map((g) => {
    const unlocked = machineMeetsRequirement(stats, g.requires);
    return {
      id: g.id,
      title: g.title,
      tagline: g.tagline,
      implemented: g.implemented,
      calendarSlot: g.calendarSlot ?? null,
      unlocked,
      requires: g.requires,
    };
  });
}

export function catalogStats() {
  const games = loadMinigamesCatalog().games;
  return {
    total: games.length,
    implemented: games.filter((g) => g.implemented).length,
  };
}

export function getCatalogGame(id: string) {
  return loadMinigamesCatalog().games.find((g) => g.id === id);
}

export function clearMinigamesCache() {
  cached = null;
}

export const MINIGAME_MIN_SCORE: Record<string, number> = {
  catch_coins: 5,
  tap_rhythm: 8,
  snake_mini: 8,
  memory_pairs: 6,
};
