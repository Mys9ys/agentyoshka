import { useEffect, useRef, useState } from 'react';
import { MinigameShell } from '../MinigameShell';

const COLS = 12;
const ROWS = 16;
const WIN = 8;
/** Стартовый шаг (мс) — спокойно, не гонка на реакцию */
const BASE_MS = 340;
const MS_PER_FOOD = 8;
type Dir = 'u' | 'd' | 'l' | 'r';
type Cell = { x: number; y: number };

type Props = {
  onWin: (score: number) => void;
  onClose: () => void;
};

function wrap(n: number, max: number) {
  return ((n % max) + max) % max;
}

function randFood(snake: Cell[]): Cell {
  for (let i = 0; i < 80; i++) {
    const c = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    if (!snake.some((s) => s.x === c.x && s.y === c.y)) return c;
  }
  return { x: 0, y: 0 };
}

export function SnakeMiniGame({ onWin, onClose }: Props) {
  const [snake, setSnake] = useState<Cell[]>([
    { x: 5, y: 8 },
    { x: 5, y: 9 },
    { x: 5, y: 10 },
  ]);
  const [food, setFood] = useState<Cell>({ x: 3, y: 3 });
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const [won, setWon] = useState(false);
  const [paused, setPaused] = useState(false);
  const dirRef = useRef<Dir>('u');
  const pendingRef = useRef<Dir>('u');
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const scoreRef = useRef(0);
  const deadRef = useRef(false);
  const wonRef = useRef(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);
  useEffect(() => {
    foodRef.current = food;
  }, [food]);
  useEffect(() => {
    deadRef.current = dead;
  }, [dead]);
  useEffect(() => {
    wonRef.current = won;
  }, [won]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        if (!deadRef.current && !wonRef.current) {
          setPaused((p) => !p);
        }
        return;
      }
      const map: Record<string, Dir> = {
        ArrowUp: 'u',
        ArrowDown: 'd',
        ArrowLeft: 'l',
        ArrowRight: 'r',
      };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      if (pausedRef.current) return;
      const cur = dirRef.current;
      if (
        (d === 'u' && cur === 'd') ||
        (d === 'd' && cur === 'u') ||
        (d === 'l' && cur === 'r') ||
        (d === 'r' && cur === 'l')
      )
        return;
      pendingRef.current = d;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const schedule = () => {
      const delay = Math.max(260, BASE_MS - scoreRef.current * MS_PER_FOOD);
      timer = setTimeout(step, delay);
    };

    const step = () => {
      if (cancelled) return;
      if (deadRef.current || wonRef.current) return;

      // Пауза: не двигаемся, но цикл ждёт — можно подумать
      if (pausedRef.current) {
        timer = setTimeout(step, 120);
        return;
      }

      dirRef.current = pendingRef.current;
      const dir = dirRef.current;
      const body = snakeRef.current;
      const head = body[0]!;
      const next: Cell = {
        x: wrap(head.x + (dir === 'l' ? -1 : dir === 'r' ? 1 : 0), COLS),
        y: wrap(head.y + (dir === 'u' ? -1 : dir === 'd' ? 1 : 0), ROWS),
      };

      if (body.some((s) => s.x === next.x && s.y === next.y)) {
        setDead(true);
        return;
      }

      const ate = next.x === foodRef.current.x && next.y === foodRef.current.y;
      const grown = [next, ...body];
      if (!ate) grown.pop();
      setSnake(grown);

      if (ate) {
        const s = scoreRef.current + 1;
        scoreRef.current = s;
        setScore(s);
        setFood(randFood(grown));
        if (s >= WIN) {
          setWon(true);
          setTimeout(() => onWin(s), 500);
          return;
        }
      }

      schedule();
    };

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [onWin]);

  function setDir(d: Dir) {
    if (paused || dead || won) return;
    const cur = dirRef.current;
    if (
      (d === 'u' && cur === 'd') ||
      (d === 'd' && cur === 'u') ||
      (d === 'l' && cur === 'r') ||
      (d === 'r' && cur === 'l')
    )
      return;
    pendingRef.current = d;
  }

  function toggleStop() {
    if (dead || won) return;
    setPaused((p) => !p);
  }

  return (
    <MinigameShell title="Змейка 2.0" onClose={onClose}>
      <p className="mb-1 text-center text-xs text-slate-400">
        Съешь {WIN} 🪙 · сейчас {score}/{WIN}
        {dead ? ' · упс, в себя' : ''}
        {paused && !dead && !won ? ' · пауза' : ''}
      </p>
      <p className="mb-2 text-center text-[10px] text-slate-500">
        Без стен · кнопка Стоп — подумать без гонки на реакцию
      </p>

      <div className="relative mx-auto w-full max-w-xs">
        <div
          className={`grid aspect-[12/16] w-full gap-px rounded-lg bg-slate-800 p-1 ${
            paused ? 'opacity-70' : ''
          }`}
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
        >
          {Array.from({ length: COLS * ROWS }).map((_, i) => {
            const x = i % COLS;
            const y = Math.floor(i / COLS);
            const isSnake = snake.some((s) => s.x === x && s.y === y);
            const isHead = snake[0]?.x === x && snake[0]?.y === y;
            const isFood = food.x === x && food.y === y;
            return (
              <div
                key={i}
                className={`aspect-square rounded-[2px] ${
                  isHead
                    ? 'bg-emerald-400'
                    : isSnake
                      ? 'bg-emerald-700'
                      : isFood
                        ? 'bg-amber-400'
                        : 'bg-slate-900'
                }`}
              />
            );
          })}
        </div>

        {paused && !dead && !won && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/50">
            <p className="rounded-full bg-amber-600/90 px-4 py-1.5 text-sm font-medium text-white">
              Стоп · подумай
            </p>
          </div>
        )}
      </div>

      {/* D-pad: Стоп по центру */}
      <div className="mt-3 grid grid-cols-3 place-items-center gap-2">
        <span />
        <button
          type="button"
          disabled={paused || dead || won}
          className="rounded-lg bg-white/10 px-4 py-2 disabled:opacity-40"
          onClick={() => setDir('u')}
        >
          ↑
        </button>
        <span />
        <button
          type="button"
          disabled={paused || dead || won}
          className="rounded-lg bg-white/10 px-4 py-2 disabled:opacity-40"
          onClick={() => setDir('l')}
        >
          ←
        </button>
        <button
          type="button"
          disabled={dead || won}
          onClick={toggleStop}
          className={`min-w-[4.5rem] rounded-xl px-3 py-2.5 text-xs font-semibold active:scale-95 ${
            paused
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
          }`}
        >
          {paused ? '▶ Играть' : '⏹ Стоп'}
        </button>
        <button
          type="button"
          disabled={paused || dead || won}
          className="rounded-lg bg-white/10 px-4 py-2 disabled:opacity-40"
          onClick={() => setDir('r')}
        >
          →
        </button>
        <span />
        <button
          type="button"
          disabled={paused || dead || won}
          className="rounded-lg bg-white/10 px-4 py-2 disabled:opacity-40"
          onClick={() => setDir('d')}
        >
          ↓
        </button>
        <span />
      </div>

      <p className="mt-2 text-center text-[10px] text-slate-600">
        Позже: после нескольких побед откроется «Авто» — змейка сама доест. Пока важен успех, не
        скорость.
      </p>

      {won && <p className="mt-2 text-center text-sm text-emerald-300">Победа! Записываем…</p>}
      {dead && !won && (
        <p className="mt-2 text-center text-xs text-rose-300">Закрой и попробуй ещё раз</p>
      )}
    </MinigameShell>
  );
}
