import type { Agent } from '@prisma/client';
import type { TechBranchView, TechNodeStatus, TechNodeView } from '@agentyoshka/shared';
import { gradeAtLeast, getShopItem, loadShop, type ShopItem } from './shop.js';

const STARTER_SKIN = 'bear_cream';

export function requirementsMet(item: ShopItem, ownedIds: Set<string>): boolean {
  const reqs = item.requires ?? [];
  return reqs.every((id) => ownedIds.has(id));
}

export function missingRequirements(item: ShopItem, ownedIds: Set<string>): string[] {
  return (item.requires ?? []).filter((id) => !ownedIds.has(id));
}

export function nodeStatus(
  item: ShopItem,
  ownedIds: Set<string>,
  agent: Agent,
  equippedSkinId: string,
): { status: TechNodeStatus; lockReason: string | null } {
  const owned = ownedIds.has(item.id);
  if (owned) {
    if (item.kind === 'skin' && item.skinId === equippedSkinId) {
      return { status: 'equipped', lockReason: null };
    }
    return { status: 'owned', lockReason: null };
  }

  const missing = missingRequirements(item, ownedIds);
  if (missing.length > 0) {
    const labels = missing
      .map((id) => getShopItem(id)?.label ?? id)
      .join(', ');
    return { status: 'locked', lockReason: `Нужно: ${labels}` };
  }

  if (item.minGrade && !gradeAtLeast(agent.trainingGrade, item.minGrade)) {
    return { status: 'locked', lockReason: `Нужен грейд ${item.minGrade}` };
  }

  return { status: 'available', lockReason: null };
}

function shopItemToNodeView(
  item: ShopItem,
  ownedIds: Set<string>,
  agent: Agent,
  coins: number,
): TechNodeView {
  const { status, lockReason } = nodeStatus(item, ownedIds, agent, agent.baseSkinId);
  const canBuy = status === 'available' && coins >= item.price;

  return {
    id: item.id,
    kind: item.kind,
    branch: item.branch!,
    tier: item.tier ?? 1,
    label: item.label,
    description: item.description,
    price: item.price,
    skinId: item.skinId,
    effect: item.effect ?? null,
    requires: item.requires ?? [],
    status,
    lockReason,
    canBuy,
    equipped: item.kind === 'skin' && item.skinId === agent.baseSkinId,
  };
}

export function buildTechTree(agent: Agent, ownedItemIds: string[], coins: number): TechBranchView[] {
  const shop = loadShop();
  const ownedIds = new Set(ownedItemIds);

  return shop.branches.map((branch) => {
    const nodes = shop.items
      .filter((i) => i.branch === branch.id)
      .sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))
      .map((item) => shopItemToNodeView(item, ownedIds, agent, coins));

    const starterLabel =
      branch.id === 'culture'
        ? 'Базовая речь G0'
        : branch.id === 'social'
          ? 'Базовый тон G0'
          : branch.id === 'hardware'
            ? 'Стартовый ПК'
            : branch.id === 'visual'
              ? 'Кремовый мишка'
              : 'Старт';

    const starter: TechNodeView = {
      id: `starter_${branch.id}`,
      kind: 'upgrade',
      branch: branch.id,
      tier: 0,
      label: starterLabel,
      description: branch.subtitle,
      price: 0,
      effect: null,
      requires: [],
      status:
        branch.id === 'visual' && agent.baseSkinId === STARTER_SKIN ? 'equipped' : 'owned',
      lockReason: null,
      canBuy: false,
      equipped: branch.id === 'visual' && agent.baseSkinId === STARTER_SKIN,
      skinId: branch.id === 'visual' ? STARTER_SKIN : undefined,
    };

    const branchNodes = [starter, ...nodes];

    return {
      id: branch.id,
      label: branch.label,
      subtitle: branch.subtitle,
      emoji: branch.emoji,
      nodes: branchNodes,
      unlocked: branchNodes.filter((n) => n.status === 'owned' || n.status === 'equipped').length,
      total: branchNodes.length,
    };
  });
}
