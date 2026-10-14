import { useCallback, useEffect, useState } from 'react';
import type { AgentProfile, DailyLoginStateResponse } from '@agentyoshka/shared';
import { ArtIcon, btnPrimary } from '../design-system/ui';
import { apiFetch } from '../lib/api';

type Props = {
  onClaimed: (coins: number, agent?: AgentProfile) => void;
};

export function DailyLoginCard({ onClaimed }: Props) {
  const [data, setData] = useState<DailyLoginStateResponse | null>(null);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch('/demo/daily-login');
    const json = (await res.json()) as DailyLoginStateResponse;
    if (json.ok) setData(json);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function claim() {
    setClaiming(true);
    try {
      const res = await apiFetch('/demo/daily-login/claim', { method: 'POST' });
      const json = (await res.json()) as DailyLoginStateResponse & {
        agent?: AgentProfile;
        coins?: number;
        granted?: { coins: number; hardwareDrop?: string | null; label: string };
      };
      if (json.ok) {
        await load();
        if (typeof json.coins === 'number') onClaimed(json.coins, json.agent);
      }
    } finally {
      setClaiming(false);
    }
  }

  if (!data?.ok) return null;

  const table = data.rewardTable ?? [];
  const nextDay = data.nextStreakDay ?? 1;

  return (
    <section className="rounded-card border border-line bg-paper p-4 shadow-card">
      <div className="mb-3 flex items-start gap-2">
        <ArtIcon name="daily" className="h-12 w-12 shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight text-ink">Дейлик</p>
          {data.tick?.active && (
            <p className="text-xs text-ink-soft">
              {data.tick.label} · день {data.tick.lifeDay}/{data.tick.durationDays} · доход ×
              {data.tick.productionMult.toFixed(2)}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-honey-soft px-2 py-1 text-xs font-bold text-ink">
          {data.loginStreak ?? 0} дн.
        </span>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1">
        {table.map((row) => {
          const active = row.day === nextDay && !data.claimedToday;
          const done = row.day < nextDay || (data.claimedToday && row.day === data.loginStreak);
          return (
            <div
              key={row.day}
              className={`rounded-xl px-1 py-1.5 text-center text-[10px] leading-tight ${
                active
                  ? 'bg-peach font-bold text-white'
                  : done
                    ? 'bg-leaf-soft font-semibold text-leaf'
                    : 'bg-cream text-ink-soft'
              }`}
              title={row.hardwareDrop ? `+ железо ${row.hardwareDrop}` : undefined}
            >
              <div className="font-bold">{row.day}</div>
              <div>{row.coins}</div>
            </div>
          );
        })}
      </div>

      {data.claimedToday ? (
        <p className="text-center text-sm font-semibold text-ink-soft">Сегодня уже забрали. Завтра ещё.</p>
      ) : (
        <button
          type="button"
          disabled={claiming}
          onClick={() => void claim()}
          className={btnPrimary}
        >
          {claiming
            ? '…'
            : `Забрать ${data.todayReward?.coins ?? 0}${
                data.todayReward?.hardwareDrop ? ' + железо' : ''
              }`}
        </button>
      )}
    </section>
  );
}
