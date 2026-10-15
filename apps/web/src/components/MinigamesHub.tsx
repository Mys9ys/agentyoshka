import { useCallback, useEffect, useState } from 'react';
import type { AgentProfile, MinigameCatalogEntry } from '@agentyoshka/shared';
import { apiFetch } from '../lib/api';
import { CatchCoinsGame } from '../minigames/catch-coins/CatchCoinsGame';
import { MemoryPairsGame } from '../minigames/memory-pairs/MemoryPairsGame';
import { SnakeMiniGame } from '../minigames/snake-mini/SnakeMiniGame';
import { SliderPuzzleGame } from '../minigames/slider-puzzle/SliderPuzzleGame';
import { TapRhythmGame } from '../minigames/tap-rhythm/TapRhythmGame';

type HubState = {
  playsLeft: number;
  maxPlaysPerDay: number;
  games: MinigameCatalogEntry[];
};

type Props = {
  onReward: (coins: number, agent?: AgentProfile, toast?: string) => void;
  embedded?: boolean;
};

export function MinigamesHub({ onReward, embedded = false }: Props) {
  const [hub, setHub] = useState<HubState | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/demo/minigames');
      const json = (await res.json()) as {
        ok?: boolean;
        playsLeft?: number;
        maxPlaysPerDay?: number;
        games?: MinigameCatalogEntry[];
        error?: string;
      };
      if (!json.ok) {
        setError(json.error ?? 'Аркада недоступна');
        return;
      }
      setHub({
        playsLeft: json.playsLeft ?? 0,
        maxPlaysPerDay: json.maxPlaysPerDay ?? 5,
        games: json.games ?? [],
      });
      setError(null);
    } catch {
      setError('Не удалось загрузить аркаду');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(minigameId: string, score: number) {
    setSaving(true);
    setActive(null);
    try {
      const res = await apiFetch('/demo/minigame-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minigameId, score }),
      });
      const json = (await res.json()) as {
        error?: string;
        coins?: number;
        agent?: AgentProfile;
        reward?: { coins?: number };
        playsLeft?: number;
      };
      if (!res.ok) {
        setError(json.error ?? 'Не записалось');
        return;
      }
      if (typeof json.coins === 'number') {
        onReward(json.coins, json.agent, `Аркада: +${json.reward?.coins ?? 0} 🪙`);
      }
      await load();
    } catch {
      setError('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  const playable = hub?.games.filter((g) => g.unlocked) ?? [];
  const locked = hub?.games.filter((g) => !g.unlocked) ?? [];

  return (
    <section className={embedded ? '' : 'rounded-card border border-line bg-paper p-4 shadow-card'}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">
          Свободные мини-игры · до {hub?.maxPlaysPerDay ?? 5} в день
        </p>
        <span className="shrink-0 rounded-full bg-honey-soft px-2.5 py-1 text-sm font-bold tabular-nums text-ink">
          {hub?.playsLeft ?? '…'}
        </span>
      </div>

      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      <ul className="flex flex-col gap-2">
        {playable.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              disabled={saving || (hub?.playsLeft ?? 0) <= 0}
              onClick={() => setActive(g.id)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-cream px-3 py-3 text-left active:scale-[0.99] disabled:opacity-50"
            >
              <span>
                <span className="block text-base font-bold text-ink">{g.title}</span>
                <span className="text-xs text-ink-soft">{g.tagline}</span>
              </span>
              <span className="shrink-0 rounded-full bg-peach px-3 py-1.5 text-sm font-bold text-white">
                Играть
              </span>
            </button>
          </li>
        ))}
      </ul>

      {locked.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-bold text-ink-soft">Закрыто железом — смотри Сервер</p>
          <ul className="flex flex-col gap-2">
            {locked.map((g) => (
              <li
                key={g.id}
                className="rounded-2xl border border-line bg-paper px-3 py-3 opacity-75"
              >
                <span className="block text-base font-bold text-ink">{g.title}</span>
                <span className="text-xs text-ink-soft">{g.tagline}</span>
                <span className="mt-1 block text-xs font-semibold text-danger">
                  RAM {g.requires.ramGb ?? 0} · GPU {g.requires.gpuTier ?? 0} · SSD{' '}
                  {g.requires.ssdGb ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hub && !error && <p className="text-sm text-ink-soft">Открываем аркаду…</p>}

      {hub && !playable.length && !error && (
        <p className="rounded-2xl bg-cream px-3 py-4 text-sm text-ink-soft">
          Пока нет открытых игр — железо смотри в Сервере.
        </p>
      )}

      {active === 'catch_coins' && (
        <CatchCoinsGame onClose={() => setActive(null)} onWin={(s) => void submit('catch_coins', s)} />
      )}
      {active === 'tap_rhythm' && (
        <TapRhythmGame onClose={() => setActive(null)} onWin={(s) => void submit('tap_rhythm', s)} />
      )}
      {active === 'snake_mini' && (
        <SnakeMiniGame onClose={() => setActive(null)} onWin={(s) => void submit('snake_mini', s)} />
      )}
      {active === 'memory_pairs' && (
        <MemoryPairsGame
          onClose={() => setActive(null)}
          onWin={(s) => void submit('memory_pairs', s)}
        />
      )}
      {active === 'slider_puzzle' && (
        <SliderPuzzleGame
          onClose={() => setActive(null)}
          onWin={(s) => void submit('slider_puzzle', s)}
        />
      )}
    </section>
  );
}
