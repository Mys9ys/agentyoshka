import { useCallback, useEffect, useState } from 'react';
import type { AgentProfile, ProductionRunView, ProductionStateResponse } from '@agentyoshka/shared';
import { btnPrimary, btnSecondary } from '../design-system/ui';
import { apiFetch } from '../lib/api';

type ProductionPanelProps = {
  onCoinsChange: (coins: number, agent?: AgentProfile) => void;
  embedded?: boolean;
};

export function ProductionPanel({ onCoinsChange, embedded = false }: ProductionPanelProps) {
  const [runs, setRuns] = useState<ProductionRunView[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [bonuses, setBonuses] = useState<ProductionStateResponse['bonuses'] | null>(null);
  const [tick, setTick] = useState<ProductionStateResponse['tick'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState<string | 'all' | null>(null);
  const [speeding, setSpeeding] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/demo/production');
      const json = (await res.json()) as ProductionStateResponse;
      if (!json.ok) {
        setError(json.error ?? 'Не удалось загрузить пул');
        return;
      }
      setRuns(json.runs ?? []);
      setTotalPending(json.totalPending ?? 0);
      setBonuses(json.bonuses ?? null);
      setTick(json.tick ?? null);
      setError(null);
    } catch {
      setError('Пул производства недоступен');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function speedup(hours = 1) {
    setSpeeding(true);
    try {
      const res = await apiFetch('/demo/production/speedup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });
      const json = (await res.json()) as ProductionStateResponse & {
        spent?: number;
        agent?: AgentProfile;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? 'Ускорение не удалось');
        return;
      }
      setRuns(json.runs ?? []);
      setTotalPending(json.totalPending ?? 0);
      if (typeof json.coins === 'number') onCoinsChange(json.coins, json.agent);
      setError(null);
    } catch {
      setError('Ошибка ускорения');
    } finally {
      setSpeeding(false);
    }
  }

  async function watchAd() {
    setAdBusy(true);
    try {
      const res = await apiFetch('/demo/ads/reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: 'ad_double_collect' }),
      });
      const json = (await res.json()) as {
        error?: string;
        coins?: number;
        agent?: AgentProfile;
        reward?: { coins?: number };
        left?: number;
      };
      if (!res.ok) {
        setError(json.error ?? 'Реклама недоступна');
        return;
      }
      if (typeof json.coins === 'number') onCoinsChange(json.coins, json.agent);
      setError(null);
    } catch {
      setError('Ошибка демо-рекламы');
    } finally {
      setAdBusy(false);
    }
  }

  async function collect(runId?: string) {
    setCollecting(runId ?? 'all');
    try {
      const res = await apiFetch('/demo/production/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runId ? { runId } : {}),
      });
      const json = (await res.json()) as ProductionStateResponse & {
        collected?: number;
        agent?: AgentProfile;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? 'Сбор не удался');
        return;
      }
      setRuns(json.runs ?? []);
      setTotalPending(json.totalPending ?? 0);
      if (typeof json.coins === 'number') {
        onCoinsChange(json.coins, json.agent);
      }
      setError(null);
    } catch {
      setError('Ошибка сбора');
    } finally {
      setCollecting(null);
    }
  }

  return (
    <section className={embedded ? '' : 'rounded-card border border-line bg-paper p-4 shadow-card'}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-sm leading-snug text-ink-soft">
          Идеи дня крутятся сами. Монеты копятся, пока мишка занят другим.
        </p>
        <span className="shrink-0 rounded-full bg-leaf-soft px-2.5 py-1 text-sm font-bold tabular-nums text-leaf">
          +{totalPending}
        </span>
      </div>

      {(tick?.active || (bonuses && bonuses.productionMult > 1)) && (
        <p className="mb-3 text-xs text-ink-soft">
          {tick?.active && (
            <>
              {tick.label} ×{tick.productionMult.toFixed(2)}{' '}
            </>
          )}
          {bonuses && bonuses.productionMult > 1 && (
            <>· железо ×{bonuses.productionMult.toFixed(2)} </>
          )}
          {bonuses && bonuses.bufferCapBonus > 0 && <>· +{bonuses.bufferCapBonus} буфер </>}
          {bonuses && bonuses.coinsPerHourBonus > 0 && <>· +{bonuses.coinsPerHourBonus}/ч</>}
        </p>
      )}

      {loading && <p className="text-sm text-ink-soft">Считаем накопления…</p>}
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      {!loading && runs.length === 0 && (
        <p className="rounded-2xl bg-cream px-3 py-4 text-sm text-ink-soft">
          Пока пусто. Закрой ивент дня — релиз попадёт сюда и начнёт капать доход.
        </p>
      )}

      <ul className="mb-3 flex flex-col gap-2">
        {runs.map((run) => {
          const fill = run.bufferCap > 0 ? Math.min(100, (run.unclaimed / run.bufferCap) * 100) : 0;
          return (
            <li key={run.id} className="rounded-2xl border border-line bg-cream px-3 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-bold text-ink">{run.title}</p>
                  <p className="text-xs text-ink-soft">{run.tagline}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {run.coinsPerHour}/ч · буфер {run.unclaimed}/{run.bufferCap}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={run.unclaimed <= 0 || collecting !== null}
                  onClick={() => void collect(run.id)}
                  className="shrink-0 rounded-full bg-leaf px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  {collecting === run.id ? '…' : `+${run.unclaimed}`}
                </button>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-honey" style={{ width: `${fill}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      {runs.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={totalPending <= 0 || collecting !== null}
            onClick={() => void collect()}
            className={btnPrimary}
          >
            {collecting === 'all' ? 'Собираем…' : `Собрать всё · ${totalPending}`}
          </button>
          <button
            type="button"
            disabled={speeding || collecting !== null}
            onClick={() => void speedup(1)}
            className={btnSecondary}
          >
            {speeding ? 'Ускоряем…' : 'Ускорить на 1 ч · 8'}
          </button>
          <button
            type="button"
            disabled={adBusy || collecting !== null}
            onClick={() => void watchAd()}
            className={btnSecondary}
          >
            {adBusy ? 'Смотрим…' : 'Демо-реклама · +12 🪙'}
          </button>
        </div>
      )}
    </section>
  );
}
