import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import type { TrainingGrade } from '@agentyoshka/shared';

const here = dirname(fileURLToPath(import.meta.url));
const shopPath = join(here, '../../../../packages/content/shop.yaml');

export type ShopItemEffect = {
  cultureXp?: number;
  level?: number;
  productionMult?: number;
  bufferCapBonus?: number;
  coinsPerHourBonus?: number;
};

export type TechBranchDef = {
  id: string;
  label: string;
  subtitle: string;
  emoji: string;
};

export type ShopItem = {
  id: string;
  kind: 'skin' | 'upgrade';
  branch: string;
  tier: number;
  requires?: string[];
  label: string;
  description: string;
  price: number;
  skinId?: string;
  minGrade?: TrainingGrade;
  effect?: ShopItemEffect;
};

type ShopFile = { branches: TechBranchDef[]; items: ShopItem[] };

let cached: ShopFile | null = null;

export function loadShop(): ShopFile {
  if (!cached) {
    const raw = readFileSync(shopPath, 'utf8');
    cached = YAML.parse(raw) as ShopFile;
  }
  return cached;
}

export function getShopItem(itemId: string): ShopItem | undefined {
  return loadShop().items.find((i) => i.id === itemId);
}

const GRADE_ORDER: TrainingGrade[] = ['G0', 'G1', 'G2', 'G3', 'G4'];

export function gradeAtLeast(current: string, required: TrainingGrade): boolean {
  const a = GRADE_ORDER.indexOf(current as TrainingGrade);
  const b = GRADE_ORDER.indexOf(required);
  if (a < 0 || b < 0) return false;
  return a >= b;
}
