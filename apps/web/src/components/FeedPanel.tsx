import { useCallback, useEffect, useState } from 'react';
import type { AgentProfile } from '@agentyoshka/shared';
import { apiFetch } from '../lib/api';
import { CatchCoinsGame } from '../minigames/catch-coins/CatchCoinsGame';
import { MemoryPairsGame } from '../minigames/memory-pairs/MemoryPairsGame';
import { SnakeMiniGame } from '../minigames/snake-mini/SnakeMiniGame';
import { TapRhythmGame } from '../minigames/tap-rhythm/TapRhythmGame';

type FeedRelease = {
  id: string;
  title: string;
  blurb: string;
  minigameId: string;
  coinsTip: number;
  playedToday: boolean;
};

type FeedBot = {
  id: string;
  displayName: string;
  grade: string;
  tagline: string;
  skinTone: string;
  releases: FeedRelease[];
};

type FeedPayload = {
  ok?: boolean;
  visitsLeft?: number;
  maxVisitsPerDay?: number;
  reward?: { baseCoins: number; bonusIfWin: number };
  bots?: FeedBot[];
  error?: string;
};

type Props = {
  onReward: (coins: number, agent?: AgentProfile, toast?: string) => void;
};

const toneClass: Record<string, string> = {
  slate: 'bg-paper',
  rose: 'bg-honey-soft',
  amber: 'bg-cream',
  cream: 'bg-paper',
};

export function FeedPanel({ onReward }: Props) {
  const [data, setData] = useState<FeedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<{
    releaseId: string;
    minigameId: string;
    title: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/demo/feed');
      const json = (await res.json()) as FeedPayload;
      if (!json.ok) {
        setError(json.error ?? 'Лента недоступна');
        return;
      }
      setData(json);
      setError(null);
    } catch {
      setError('Не удалось загрузить ленту');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(releaseId: string, score: number) {
    setSaving(true);
    setActive(null);
    try {
      const res = await apiFetch('/demo/feed/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId, score, won: score > 0 }),
      });
      const json = (await res.json()) as {
        error?: string;
        coins?: number;
        agent?: AgentProfile;
        reward?: { coins?: number };
        visitsLeft?: number;
      };
      if (!res.ok) {
        setError(json.error ?? 'Не записалось');
        return;
      }
      if (typeof json.coins === 'number') {
        onReward(
          json.coins,
          json.agent,
          `Лента: +${json.reward?.coins ?? 0} 🪙 · осталось ${json.visitsLeft ?? '—'}`,
        );
      }
      await load();
    } catch {
      setError('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  const visitsLeft = data?.visitsLeft ?? 0;
  const bots = data?.bots ?? [];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">
          Чужие релизы · до {data?.maxVisitsPerDay ?? 6} визитов в день
        </p>
        <span className="shrink-0 rounded-full bg-honey-soft px-2.5 py-1 text-sm font-bold tabular-nums text-ink">
          {data ? visitsLeft : '…'}
        </span>
      </div>

      {data?.reward && (
        <p className="mb-3 text-xs text-ink-soft">
          Награда: {data.reward.baseCoins}🪙 за визит
          {data.reward.bonusIfWin > 0 ? ` · +${data.reward.bonusIfWin} за победу` : ''}
        </p>
      )}

      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      {!data && !error && <p className="text-sm text-ink-soft">Открываем ленту…</p>}

      <ul className="flex flex-col gap-3">
        {bots.map((bot) => (
          <li
            key={bot.id}
            className={`rounded-2xl border border-line px-3 py-3 ${toneClass[bot.skinTone] ?? 'bg-cream'}`}
          >
            <div className="mb-2">
              <p className="font-display text-lg leading-none text-ink">{bot.displayName}</p>
              <p className="mt-0.5 text-xs font-semibold text-ink-soft">
                {bot.grade} · {bot.tagline}
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {bot.releases.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={saving || visitsLeft <= 0}
                    onClick={() =>
                      setActive({
                        releaseId: r.id,
                        minigameId: r.minigameId,
                        title: r.title,
                      })
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-3 py-3 text-left active:scale-[0.99] disabled:opacity-50"
                  >
                    <span>
                      <span className="block text-base font-bold text-ink">{r.title}</span>
                      <span className="text-xs text-ink-soft">{r.blurb}</span>
                      {r.playedToday && (
                        <span className="mt-1 block text-xs font-semibold text-leaf">
                          Уже заходили сегодня
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-peach px-3 py-1.5 text-sm font-bold text-white">
                      Играть
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {active?.minigameId === 'catch_coins' && (
        <CatchCoinsGame
          onClose={() => setActive(null)}
          onWin={(s) => void submit(active.releaseId, s)}
        />
      )}
      {active?.minigameId === 'tap_rhythm' && (
        <TapRhythmGame
          onClose={() => setActive(null)}
          onWin={(s) => void submit(active.releaseId, s)}
        />
      )}
      {active?.minigameId === 'snake_mini' && (
        <SnakeMiniGame
          onClose={() => setActive(null)}
          onWin={(s) => void submit(active.releaseId, s)}
        />
      )}
      {active?.minigameId === 'memory_pairs' && (
        <MemoryPairsGame
          onClose={() => setActive(null)}
          onWin={(s) => void submit(active.releaseId, s)}
        />
      )}
    </section>
  );
}
