import { useMemo, useRef, useState } from 'react';
import { MinigameShell } from '../MinigameShell';

const ICONS = ['🐻', '🪙', '📚', '🖥️', '⚡', '🎮'];

type Card = { id: number; icon: string; flipped: boolean; matched: boolean };

type Props = {
  onWin: (score: number) => void;
  onClose: () => void;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function MemoryPairsGame({ onWin, onClose }: Props) {
  const initial = useMemo(() => {
    const deck = shuffle([...ICONS, ...ICONS]).map((icon, id) => ({
      id,
      icon,
      flipped: false,
      matched: false,
    }));
    return deck;
  }, []);

  const [cards, setCards] = useState<Card[]>(initial);
  const [open, setOpen] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const movesRef = useRef(0);

  function flip(id: number) {
    if (busy || done) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (open.length >= 2) return;

    const nextOpen = [...open, id];
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)));
    setOpen(nextOpen);

    if (nextOpen.length < 2) return;

    movesRef.current += 1;
    setMoves(movesRef.current);
    setBusy(true);
    const [a, b] = nextOpen;
    const ca = cards.find((c) => c.id === a)!;
    const iconA = ca.icon;
    const iconB = card.icon;

    setTimeout(() => {
      if (iconA === iconB) {
        setCards((prev) => {
          const updated = prev.map((c) =>
            c.id === a || c.id === b ? { ...c, matched: true, flipped: true } : c,
          );
          if (updated.every((c) => c.matched)) {
            setDone(true);
            const score = Math.max(6, 24 - movesRef.current);
            setTimeout(() => onWin(score), 450);
          }
          return updated;
        });
      } else {
        setCards((prev) =>
          prev.map((c) =>
            c.id === a || c.id === b ? { ...c, flipped: false } : c,
          ),
        );
      }
      setOpen([]);
      setBusy(false);
    }, 450);
  }

  return (
    <MinigameShell title="Пары карточек" onClose={onClose}>
      <p className="mb-2 text-center text-xs text-slate-400">
        Найди 6 пар · ходы: {moves}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={c.matched || busy}
            onClick={() => flip(c.id)}
            className={`flex aspect-square items-center justify-center rounded-xl text-2xl transition ${
              c.flipped || c.matched
                ? 'bg-indigo-600/40'
                : 'bg-slate-800 active:scale-95'
            }`}
          >
            {c.flipped || c.matched ? c.icon : '❓'}
          </button>
        ))}
      </div>
      {done && (
        <p className="mt-3 text-center text-sm text-emerald-300">Все пары! Записываем…</p>
      )}
    </MinigameShell>
  );
}
