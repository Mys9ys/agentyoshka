import { useState } from 'react';
import type { TechBranchView, TechNodeView } from '@agentyoshka/shared';
import { ArtIcon, type ArtName } from '../design-system/ui';

const NODE_SIZE = 56;
const ROW_H = 88;
const COL_W = 72;
const PAD = 20;

const SKIN_RING: Record<string, string> = {
  bear_cream: '#fcd34d',
  bear_amber: '#fb923c',
  bear_slate: '#94a3b8',
  bear_rose: '#f472b6',
};

function ringColor(node: TechNodeView): string {
  if (node.skinId && SKIN_RING[node.skinId]) return SKIN_RING[node.skinId];
  switch (node.status) {
    case 'equipped':
      return '#2f9d62';
    case 'owned':
      return '#2a9d8f';
    case 'available':
      return '#e8a317';
    default:
      return '#e7d3bc';
  }
}

function branchArt(branchId: string): ArtName {
  if (branchId === 'culture') return 'book';
  if (branchId === 'hardware') return 'server';
  if (branchId === 'social') return 'profile';
  return 'shop';
}

function NodeGlyph({ node }: { node: TechNodeView }) {
  const art = branchArt(node.branch);
  return <ArtIcon name={art} className="h-8 w-8 object-contain" />;
}

/** Вертикальное дерево: tier 0 сверху, ветвление внутри ряда по горизонали (без скролла вбок). */
function layoutNodesVertical(nodes: TechNodeView[]) {
  const byTier = new Map<number, TechNodeView[]>();
  for (const n of nodes) {
    const list = byTier.get(n.tier) ?? [];
    list.push(n);
    byTier.set(n.tier, list);
  }
  const tiers = [...byTier.keys()].sort((a, b) => a - b);
  const maxCols = Math.max(1, ...[...byTier.values()].map((c) => c.length));
  const positions = new Map<string, { x: number; y: number }>();
  const idSet = new Set(nodes.map((n) => n.id));

  tiers.forEach((tier, rowIdx) => {
    const row = byTier.get(tier)!;
    const rowWidth = (row.length - 1) * COL_W;
    row.forEach((node, colIdx) => {
      positions.set(node.id, {
        x: PAD + maxCols * (COL_W / 2) - rowWidth / 2 + colIdx * COL_W,
        y: PAD + rowIdx * ROW_H + NODE_SIZE / 2,
      });
    });
  });

  const edges: { from: string; to: string }[] = [];
  const starter = nodes.find((n) => n.id.startsWith('starter_'));
  for (const node of nodes) {
    for (const req of node.requires) {
      if (idSet.has(req)) edges.push({ from: req, to: node.id });
    }
    if (starter && node.tier === 1 && node.requires.length === 0 && node.id !== starter.id) {
      edges.push({ from: starter.id, to: node.id });
    }
  }

  const width = PAD * 2 + Math.max(maxCols - 1, 0) * COL_W + NODE_SIZE;
  const height = PAD * 2 + (tiers.length - 1) * ROW_H + NODE_SIZE + 48;

  return { positions, edges, width, height };
}

type TechTreeViewProps = {
  branches: TechBranchView[];
  mode: 'shop' | 'profile';
  busyId?: string | null;
  onPurchase?: (itemId: string) => void;
  onEquip?: (skinId: string) => void;
};

function NodeTooltip({
  node,
  isStarter,
  mode,
  busyId,
  placement,
  visible,
  onPurchase,
  onEquip,
}: {
  node: TechNodeView;
  isStarter: boolean;
  mode: 'shop' | 'profile';
  busyId?: string | null;
  placement: 'above' | 'below';
  visible: boolean;
  onPurchase?: (itemId: string) => void;
  onEquip?: (skinId: string) => void;
}) {
  if (!visible) return null;

  const posClass =
    placement === 'above'
      ? 'bottom-[calc(100%+14px)]'
      : 'top-[calc(100%+14px)]';

  return (
    <div
      className={`pointer-events-auto absolute left-1/2 z-[200] w-[min(13rem,calc(100vw-2.5rem))] -translate-x-1/2 ${posClass} rounded-2xl border border-line bg-paper p-3 text-left shadow-card`}
      role="tooltip"
    >
      <p className="text-sm font-bold text-ink">{node.label}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{node.description}</p>
      {!isStarter && node.price > 0 && (
        <p className="mt-1.5 text-xs font-bold text-honey">{node.price}</p>
      )}
      {node.lockReason && <p className="mt-1 text-[11px] text-danger">{node.lockReason}</p>}
      {node.status === 'equipped' && (
        <p className="mt-1 text-[11px] font-bold text-leaf">Активно</p>
      )}
      {node.status === 'owned' && node.kind === 'upgrade' && (
        <p className="mt-1 text-[11px] font-bold text-teal">Изучено</p>
      )}
      {mode === 'shop' && !isStarter && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {node.canBuy && onPurchase && (
            <button
              type="button"
              disabled={busyId != null}
              onClick={(e) => {
                e.stopPropagation();
                onPurchase(node.id);
              }}
              className="rounded-full bg-peach px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50"
            >
              {busyId === node.id ? '…' : 'Исследовать'}
            </button>
          )}
          {node.kind === 'skin' &&
            (node.status === 'owned' || node.status === 'equipped') &&
            !node.equipped &&
            node.skinId &&
            onEquip && (
              <button
                type="button"
                disabled={busyId != null}
                onClick={(e) => {
                  e.stopPropagation();
                  onEquip(node.skinId!);
                }}
                className="rounded-full bg-teal px-3 py-1 text-[11px] font-bold text-white"
              >
                Надеть
              </button>
            )}
        </div>
      )}
      {mode === 'profile' &&
        node.kind === 'skin' &&
        node.status === 'owned' &&
        !node.equipped &&
        node.skinId &&
        onEquip && (
          <button
            type="button"
            disabled={busyId != null}
            className="mt-2 text-[11px] font-bold text-teal underline"
            onClick={(e) => {
              e.stopPropagation();
              onEquip(node.skinId!);
            }}
          >
            Надеть
          </button>
        )}
    </div>
  );
}

function BranchGraph({
  branch,
  mode,
  busyId,
  onPurchase,
  onEquip,
}: {
  branch: TechBranchView;
  mode: 'shop' | 'profile';
  busyId?: string | null;
  onPurchase?: (itemId: string) => void;
  onEquip?: (skinId: string) => void;
}) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const { positions, edges, width, height } = layoutNodesVertical(branch.nodes);

  return (
    <section className="rounded-card border border-line bg-paper p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 font-display text-lg leading-tight text-ink">
            <ArtIcon name={branchArt(branch.id)} className="h-8 w-8 object-contain" />
            {branch.label}
          </p>
          <p className="text-xs text-ink-soft">{branch.subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-honey-soft px-2 py-0.5 text-[11px] font-bold text-ink">
          {branch.unlocked}/{branch.total}
        </span>
      </div>

      <div className="mx-auto w-full max-w-full" style={{ maxWidth: width }}>
        <div className="relative isolate mx-auto" style={{ width, height }}>
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {edges.map(({ from, to }) => {
              const a = positions.get(from);
              const b = positions.get(to);
              if (!a || !b) return null;
              const my = (a.y + b.y) / 2;
              return (
                <path
                  key={`${from}-${to}`}
                  d={`M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`}
                  fill="none"
                  stroke="rgba(232, 163, 23, 0.85)"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          {branch.nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const isStarter = node.id.startsWith('starter_');
            const open = pinnedId === node.id;
            const hovered = hoverId === node.id;
            const lifted = open || hovered;
            const ring = ringColor(node);
            const dimmed = node.status === 'locked';
            const placement: 'above' | 'below' = pos.y > height * 0.52 ? 'above' : 'below';

            return (
              <div
                key={node.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${lifted ? 'z-[100]' : 'z-10'}`}
                style={{ left: pos.x, top: pos.y }}
                onMouseEnter={() => setHoverId(node.id)}
                onMouseLeave={() => setHoverId((id) => (id === node.id ? null : id))}
              >
                <button
                  type="button"
                  className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 bg-cream text-lg shadow-soft transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-peach ${dimmed ? 'opacity-55' : ''}`}
                  style={{ borderColor: ring }}
                  aria-label={node.label}
                  aria-expanded={open}
                  onClick={() => setPinnedId(open ? null : node.id)}
                >
                  <NodeGlyph node={node} />
                  <span className="absolute -right-1 -top-1 rounded-full bg-paper px-1 text-[8px] font-bold text-ink-soft">
                    T{node.tier}
                  </span>
                </button>

                <NodeTooltip
                  node={node}
                  isStarter={isStarter}
                  mode={mode}
                  busyId={busyId}
                  placement={placement}
                  visible={lifted}
                  onPurchase={onPurchase}
                  onEquip={onEquip}
                />
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-ink-soft">
        Сверху вниз · наведи или нажми на узел
      </p>
    </section>
  );
}

export function TechTreeView({ branches, mode, busyId, onPurchase, onEquip }: TechTreeViewProps) {
  return (
    <div className="flex flex-col gap-5">
      {branches.map((branch) => (
        <BranchGraph
          key={branch.id}
          branch={branch}
          mode={mode}
          busyId={busyId}
          onPurchase={onPurchase}
          onEquip={onEquip}
        />
      ))}
    </div>
  );
}
