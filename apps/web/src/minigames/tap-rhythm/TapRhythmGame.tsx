import { useEffect, useRef, useState } from 'react';
import { MinigameShell } from '../MinigameShell';

const WIN_HITS = 8;
const LANES = 3;
const LANE_LABELS = ['Левая', 'Центр', 'Правая'];
/** Зона удара: шарик в жёлтой полосе (~78–92%) */
const HIT_MIN = 76;
const HIT_MAX = 94;

type Note = { id: number; lane: number; y: number };

type Props = {
  onWin: (score: number) => void;
  onClose: () => void;
};

export function TapRhythmGame({ onWin, onClose }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [done, setDone] = useState(false);
  const [flash, setFlash] = useState<'ok' | 'miss' | null>(null);
  const [hint, setHint] = useState(true);
  const idRef = useRef(0);
  const hitsRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    hitsRef.current = hits;
  }, [hits]);

  useEffect(() => {
    // Медленнее спавн и падение — чтобы успеть понять игру
    const spawn = setInterval(() => {
      if (doneRef.current) return;
      idRef.current += 1;
      setNotes((prev) => {
        // Не больше 2 шариков сразу
        if (prev.length >= 2) return prev;
        return [
          ...prev,
          { id: idRef.current, lane: Math.floor(Math.random() * LANES), y: -6 },
        ];
      });
    }, 1100);

    const tick = setInterval(() => {
      if (doneRef.current) return;
      setNotes((prev) => {
        const next: Note[] = [];
        let missed = 0;
        for (const n of prev) {
          const y = n.y + 2.2;
          if (y > 105) missed += 1;
          else next.push({ ...n, y });
        }
        if (missed) {
          setMisses((m) => m + missed);
          setFlash('miss');
        }
        return next;
      });
    }, 45);

    const hideHint = setTimeout(() => setHint(false), 5000);

    return () => {
      clearInterval(spawn);
      clearInterval(tick);
      clearTimeout(hideHint);
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 220);
    return () => clearTimeout(t);
  }, [flash]);

  function tapLane(lane: number) {
    if (doneRef.current) return;
    setHint(false);
    setNotes((prev) => {
      const idx = prev.findIndex(
        (n) => n.lane === lane && n.y >= HIT_MIN && n.y <= HIT_MAX,
      );
      if (idx < 0) {
        setMisses((m) => m + 1);
        setFlash('miss');
        return prev;
      }
      const next = [...prev];
      next.splice(idx, 1);
      const score = hitsRef.current + 1;
      hitsRef.current = score;
      setHits(score);
      setFlash('ok');
      if (score >= WIN_HITS) {
        doneRef.current = true;
        setDone(true);
        setTimeout(() => onWin(score), 500);
      }
      return next;
    });
  }

  return (
    <MinigameShell title="Ритм-тапы" onClose={onClose}>
      <div className="mb-2 space-y-1 text-center">
        <p className="text-sm text-slate-200">
          {hits}/{WIN_HITS} попаданий · промах {misses}
        </p>
        <p className="text-[11px] leading-snug text-slate-400">
          Шарики падают сверху. Жми колонку, когда шарик в{' '}
          <span className="text-amber-300">жёлтой полосе</span> внизу.
        </p>
      </div>

      {hint && (
        <p className="mb-2 rounded-lg bg-amber-500/15 px-2 py-1.5 text-center text-[11px] text-amber-100">
          Как Guitar Hero / Piano Tiles: дождись полосы — и тапни
        </p>
      )}

      <div
        className={`relative mx-auto h-72 w-full max-w-xs overflow-hidden rounded-xl border ${
          flash === 'ok'
            ? 'border-emerald-400/60'
            : flash === 'miss'
              ? 'border-rose-400/50'
              : 'border-white/10'
        } bg-black/40`}
      >
        <div className="pointer-events-none absolute inset-x-0 z-10 flex h-12 items-center justify-center border-y-2 border-amber-400/70 bg-amber-500/20"
          style={{ bottom: '14%' }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            Жми здесь
          </span>
        </div>

        <div className="grid h-full grid-cols-3">
          {Array.from({ length: LANES }).map((_, lane) => (
            <button
              key={lane}
              type="button"
              onClick={() => tapLane(lane)}
              className="relative border-r border-white/10 last:border-0 active:bg-violet-500/20"
              aria-label={LANE_LABELS[lane]}
            >
              {notes
                .filter((n) => n.lane === lane)
                .map((n) => {
                  const inZone = n.y >= HIT_MIN && n.y <= HIT_MAX;
                  return (
                    <span
                      key={n.id}
                      className={`absolute left-1/2 h-9 w-9 -translate-x-1/2 rounded-full shadow ${
                        inZone ? 'bg-amber-300 ring-2 ring-white' : 'bg-violet-400'
                      }`}
                      style={{ top: `${n.y}%` }}
                    />
                  );
                })}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1">
        {LANE_LABELS.map((label, lane) => (
          <button
            key={label}
            type="button"
            onClick={() => tapLane(lane)}
            className="rounded-lg bg-violet-600/40 py-2.5 text-xs font-medium text-violet-100 active:scale-95"
          >
            {label}
          </button>
        ))}
      </div>

      {done && (
        <p className="mt-3 text-center text-sm text-emerald-300">Отлично! Записываем…</p>
      )}
    </MinigameShell>
  );
}
