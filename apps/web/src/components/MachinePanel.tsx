import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MachineStateResponse, MinigameCatalogEntry } from '@agentyoshka/shared';
import { Sheet } from '../design-system/ui';
import { apiFetch } from '../lib/api';

type Props = {
  open: boolean;
  onClose: () => void;
};

function gapLabel(g: MinigameCatalogEntry, stats?: MachineStateResponse['stats']) {
  if (!stats) {
    return `Нужно: RAM ${g.requires.ramGb ?? 0} · GPU ${g.requires.gpuTier ?? 0} · SSD ${g.requires.ssdGb ?? 0}`;
  }
  const parts: string[] = [];
  if ((g.requires.ramGb ?? 0) > stats.ramGb) {
    parts.push(`RAM +${(g.requires.ramGb ?? 0) - stats.ramGb} ГБ`);
  }
  if ((g.requires.gpuTier ?? 0) > stats.gpuTier) {
    parts.push(`GPU tier ${g.requires.gpuTier}`);
  }
  if ((g.requires.ssdGb ?? 0) > stats.ssdGb) {
    parts.push(`SSD +${(g.requires.ssdGb ?? 0) - stats.ssdGb} ГБ`);
  }
  return parts.length ? `Ещё: ${parts.join(' · ')}` : 'Чуть не хватает железа';
}

function GameRow({
  g,
  stats,
}: {
  g: MinigameCatalogEntry;
  stats?: MachineStateResponse['stats'];
}) {
  return (
    <li
      className={`rounded-2xl border px-3 py-2 text-sm ${
        g.unlocked ? 'border-line bg-paper' : 'border-line bg-cream opacity-80'
      }`}
    >
      <div className="flex justify-between gap-2">
        <span className="font-bold text-ink">{g.title}</span>
        {g.implemented ? (
          g.unlocked ? (
            <span className="font-bold text-leaf">открыто</span>
          ) : (
            <span className="font-semibold text-peach-deep">лок</span>
          )
        ) : (
          <span className="text-ink-soft">скоро</span>
        )}
      </div>
      <p className="text-xs text-ink-soft">{g.tagline}</p>
      {!g.unlocked && <p className="mt-0.5 text-xs text-danger">{gapLabel(g, stats)}</p>}
      {!g.implemented && g.unlocked && (
        <p className="mt-0.5 text-xs text-ink-soft">Железо ок — мишка ещё пилит билд</p>
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

  const groups = useMemo(() => {
    const list = data?.minigames ?? [];
    const openNow = list.filter((g) => g.unlocked && g.implemented);
    const nextHardware = list
      .filter((g) => !g.unlocked)
      .slice()
      .sort((a, b) => {
        const score = (g: MinigameCatalogEntry) =>
          (g.requires.ramGb ?? 0) + (g.requires.ssdGb ?? 0) / 10 + (g.requires.gpuTier ?? 0) * 20;
        return score(a) - score(b);
      })
      .slice(0, 5);
    const coming = list.filter((g) => g.unlocked && !g.implemented).slice(0, 4);
    return { openNow, nextHardware, coming };
  }, [data?.minigames]);

  if (!open) return null;

  return (
    <Sheet
      title="Сервер"
      subtitle="Железо открывает мини-игры. Смотри, что дальше."
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
            <div key={c.key} className="min-h-0 rounded-2xl border border-line bg-paper p-3 shadow-soft">
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
        <p className="mb-3 text-sm text-ink-soft">
          Сейчас можно играть: {groups.openNow.length} · в каталоге {data.catalog.implemented}/
          {data.catalog.total} с билдом.
        </p>
      )}

      {groups.openNow.length > 0 && (
        <section className="mb-4">
          <p className="mb-2 font-display text-base text-ink">Открыто сейчас</p>
          <ul className="flex flex-col gap-2">
            {groups.openNow.map((g) => (
              <GameRow key={g.id} g={g} stats={data?.stats} />
            ))}
          </ul>
        </section>
      )}

      {groups.nextHardware.length > 0 && (
        <section className="mb-4">
          <p className="mb-1 font-display text-base text-ink">Что открыть дальше</p>
          <p className="mb-2 text-xs text-ink-soft">Купи железо в Магазине или забери дейлик с дропом.</p>
          <ul className="flex flex-col gap-2">
            {groups.nextHardware.map((g) => (
              <GameRow key={g.id} g={g} stats={data?.stats} />
            ))}
          </ul>
        </section>
      )}

      {groups.coming.length > 0 && (
        <section className="mb-4">
          <p className="mb-2 font-display text-base text-ink">Мишка пилит</p>
          <ul className="flex flex-col gap-2 pb-2">
            {groups.coming.map((g) => (
              <GameRow key={g.id} g={g} stats={data?.stats} />
            ))}
          </ul>
        </section>
      )}
    </Sheet>
  );
}
