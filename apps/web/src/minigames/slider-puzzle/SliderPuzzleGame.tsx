import { useMemo, useState } from 'react';
import { MinigameShell } from '../MinigameShell';

type Props = {
  onWin: (score: number) => void;
  onClose: () => void;
};

const SIZE = 3;
const N = SIZE * SIZE;

function solved(): number[] {
  return Array.from({ length: N }, (_, i) => (i + 1) % N);
}

function shuffleBoard(): number[] {
  let tiles = solved();
  // случайные валидные ходы от решённого — всегда solvable
  let empty = N - 1;
  for (let k = 0; k < 40; k++) {
    const neighbors = neighborsOf(empty);
    const next = neighbors[Math.floor(Math.random() * neighbors.length)]!;
    tiles = swap(tiles, empty, next);
    empty = next;
  }
  if (tiles.every((v, i) => v === (i + 1) % N)) {
    return shuffleBoard();
  }
  return tiles;
}

function neighborsOf(empty: number): number[] {
  const r = Math.floor(empty / SIZE);
  const c = empty % SIZE;
  const out: number[] = [];
  if (r > 0) out.push(empty - SIZE);
  if (r < SIZE - 1) out.push(empty + SIZE);
  if (c > 0) out.push(empty - 1);
  if (c < SIZE - 1) out.push(empty + 1);
  return out;
}

function swap(tiles: number[], a: number, b: number): number[] {
  const next = [...tiles];
  const t = next[a]!;
  next[a] = next[b]!;
  next[b] = t;
  return next;
}

const LABELS: Record<number, string> = {
  1: '🐻',
  2: '🪙',
  3: '📚',
  4: '🖥️',
  5: '⚡',
  6: '🎮',
  7: '🍯',
  8: '⭐',
};

export function SliderPuzzleGame({ onWin, onClose }: Props) {
  const start = useMemo(() => shuffleBoard(), []);
  const [tiles, setTiles] = useState(start);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);

  function tap(index: number) {
    if (done) return;
    const empty = tiles.indexOf(0);
    if (!neighborsOf(empty).includes(index)) return;
    const next = swap(tiles, empty, index);
    const nextMoves = moves + 1;
    setTiles(next);
    setMoves(nextMoves);
    const win = next.every((v, i) => v === (i + 1) % N);
    if (win) {
      setDone(true);
      const score = Math.max(6, 30 - nextMoves);
      window.setTimeout(() => onWin(score), 400);
    }
  }

  return (
    <MinigameShell title="Пятнашки" onClose={onClose}>
      <p className="mb-2 text-center text-sm text-ink-soft">
        Собери ряд 1→8. Ходов: {moves}
        {done ? ' · готово!' : ''}
      </p>
      <div className="mx-auto grid aspect-square w-full max-w-[280px] grid-cols-3 gap-2">
        {tiles.map((v, i) =>
          v === 0 ? (
            <div key={i} className="rounded-2xl bg-cream" />
          ) : (
            <button
              key={i}
              type="button"
              disabled={done}
              onClick={() => tap(i)}
              className="flex items-center justify-center rounded-2xl border border-line bg-honey-soft text-2xl shadow-soft active:scale-[0.97] disabled:opacity-70"
            >
              {LABELS[v] ?? v}
            </button>
          ),
        )}
      </div>
    </MinigameShell>
  );
}
