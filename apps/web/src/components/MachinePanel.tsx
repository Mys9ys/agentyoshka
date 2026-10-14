import { useCallback, useEffect, useState } from 'react';
import type { MachineStateResponse, MinigameCatalogEntry } from '@agentyoshka/shared';
import { Sheet } from '../design-system/ui';
import { apiFetch } from '../lib/api';

type Props = {
  open: boolean;
  onClose: () => void;
};

function GameRow({ g }: { g: MinigameCatalogEntry }) {
  return (
    <li
      className={`rounded-2xl border px-3 py-2 text-sm ${
        g.unlocked ? 'border-line bg-paper' : 'border-line bg-cream opacity-70'
      }`}
    >
      <div className="flex justify-between gap-2">
        <span className="font-bold text-ink">{g.title}</span>
        {g.implemented ? (
          <span className="font-bold text-leaf">игра</span>
        ) : (
          <span className="text-ink-soft">мишка пилит</span>
        )}
      </div>
      <p className="text-xs text-ink-soft">{g.tagline}</p>
      {!g.unlocked && (
        <p className="text-xs text-danger">
          Нужно: RAM {g.requires.ramGb ?? 0} · GPU {g.requires.gpuTier ?? 0} · SSD{' '}
          {g.requires.ssdGb ?? 0}
        </p>
      )}
    </li>
  );
}

export function MachinePanel({ open, onClose }: Props) {
  const [data, setData] = useState<MachineStateResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/demo/machine');
      const json = (await res.json()) as MachineStateResponse;
      if (json.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  return (
    <Sheet
      title="Сервер"
      subtitle="От железа зависит, какие мини-игры мишка сможет запилить"
      onClose={onClose}
      zClass="z-50"
    >
      {loading && <p className="text-sm text-ink-soft">Смотрим стойку…</p>}

      {data?.tick?.active && (
        <p className="mb-3 rounded-2xl bg-honey-soft px-3 py-2 text-sm text-ink">
          {data.tick.tagline} Сейчас ×{data.tick.productionMult.toFixed(2)} к доходу.
        </p>
      )}

      {data?.components && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {data.components.map((c) => (
            <div key={c.key} className="min-w-0 rounded-2xl border border-line bg-paper p-3 shadow-soft">
              <p className="text-xs font-bold text-ink-soft">
                {c.icon} {c.label}
              </p>
              <p className="text-lg font-extrabold leading-tight text-ink">
                {'display' in c && c.display ? c.display : `${c.value} ${c.unit}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {data?.catalog && (
        <p className="mb-2 text-sm text-ink-soft">
          Мини-игры: {data.catalog.implemented} из {data.catalog.total} уже можно играть. Остальное
          мишка ещё пилит.
        </p>
      )}

      <ul className="flex flex-col gap-2 pb-4">
        {(data?.minigames ?? []).map((g) => (
          <GameRow key={g.id} g={g} />
        ))}
      </ul>
    </Sheet>
  );
}
