import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Prisma } from '@prisma/client';
import YAML from 'yaml';
import { getShopItem } from './shop.js';

const here = dirname(fileURLToPath(import.meta.url));
const machinePath = join(here, '../../../../packages/content/machine.yaml');

type MachineFile = {
  base: { ramGb: number; gpuTier: number; ssdGb: number; hddGb: number; gpuLabels: string[] };
  components: Record<string, { label: string; unit: string; icon: string }>;
  shopBoosts: Record<string, Partial<{ ramGb: number; gpuTier: number; ssdGb: number; hddGb: number }>>;
};

let cached: MachineFile | null = null;

function loadMachineConfig(): MachineFile {
  if (!cached) {
    cached = YAML.parse(readFileSync(machinePath, 'utf8')) as MachineFile;
  }
  return cached;
}

export type MachineStats = {
  ramGb: number;
  gpuTier: number;
  ssdGb: number;
  hddGb: number;
  gpuLabel: string;
};

export function computeMachineStats(ownedItemIds: string[]): MachineStats {
  const cfg = loadMachineConfig();
  let ramGb = cfg.base.ramGb;
  let gpuTier = cfg.base.gpuTier;
  let ssdGb = cfg.base.ssdGb;
  let hddGb = cfg.base.hddGb;

  let gpuAdd = 0;
  for (const id of ownedItemIds) {
    const boost = cfg.shopBoosts[id];
    if (!boost) continue;
    ramGb += boost.ramGb ?? 0;
    ssdGb += boost.ssdGb ?? 0;
    hddGb += boost.hddGb ?? 0;
    gpuAdd += boost.gpuTier ?? 0;
  }
  gpuTier = Math.min(cfg.base.gpuLabels.length - 1, cfg.base.gpuTier + gpuAdd);

  const labels = cfg.base.gpuLabels;
  const gpuLabel = labels[Math.min(gpuTier, labels.length - 1)] ?? 'GPU';

  return { ramGb, gpuTier, ssdGb, hddGb, gpuLabel };
}

export function machineComponentsView(stats: MachineStats) {
  const meta = loadMachineConfig().components;
  return [
    { key: 'ram', ...meta.ram!, value: stats.ramGb },
    { key: 'gpu', ...meta.gpu!, value: stats.gpuTier, display: stats.gpuLabel },
    { key: 'ssd', ...meta.ssd!, value: stats.ssdGb },
    { key: 'hdd', ...meta.hdd!, value: stats.hddGb },
  ];
}

export function machineMeetsRequirement(
  stats: MachineStats,
  req: { ramGb?: number; gpuTier?: number; ssdGb?: number; hddGb?: number },
): boolean {
  if (req.ramGb != null && stats.ramGb < req.ramGb) return false;
  if (req.gpuTier != null && stats.gpuTier < req.gpuTier) return false;
  if (req.ssdGb != null && stats.ssdGb < req.ssdGb) return false;
  if (req.hddGb != null && stats.hddGb < req.hddGb) return false;
  return true;
}

export async function grantHardwareDrop(
  tx: Prisma.TransactionClient,
  agentId: string,
  itemId: string,
  ownedIds: Set<string>,
): Promise<boolean> {
  if (ownedIds.has(itemId)) return false;
  if (!getShopItem(itemId)) return false;
  await tx.agentPurchase.create({ data: { agentId, itemId } });
  ownedIds.add(itemId);
  return true;
}
