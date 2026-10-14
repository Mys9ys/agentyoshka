import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';
import { Sheet } from '../design-system/ui';

type HowtoItem = { title: string; body: string };
type HowtoTab = {
  id: string;
  label: string;
  intro?: string;
  items: HowtoItem[];
};

type HowtoPayload = {
  ok?: boolean;
  title?: string;
  subtitle?: string;
  tabs?: HowtoTab[];
  error?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function HelpPanel({ open, onClose }: Props) {
  const [tabs, setTabs] = useState<HowtoTab[]>([]);
  const [title, setTitle] = useState('Как играть');
  const [subtitle, setSubtitle] = useState<string | undefined>();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/demo/howto'));
      const json = (await res.json()) as HowtoPayload;
      if (!json.ok || !json.tabs?.length) {
        setError(json.error ?? 'Гайд пустой');
        return;
      }
      setTitle(json.title ?? 'Как играть');
      setSubtitle(json.subtitle);
      setTabs(json.tabs);
      setActiveId((prev) => prev ?? json.tabs![0].id);
    } catch {
      setError('Не удалось загрузить Help');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <Sheet title={title} subtitle={subtitle} onClose={onClose} zClass="z-50">
      {loading && <p className="text-sm text-ink-soft">Открываем правила…</p>}
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      {tabs.length > 0 && (
        <>
          <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const on = tab.id === active?.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveId(tab.id)}
                  className={
                    on
                      ? 'shrink-0 rounded-full bg-peach px-3.5 py-2 text-sm font-bold text-white shadow-soft'
                      : 'shrink-0 rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-bold text-ink shadow-soft'
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {active && (
            <div className="flex flex-col gap-3">
              {active.intro && (
                <p className="rounded-2xl bg-honey-soft px-3 py-2.5 text-sm font-semibold leading-snug text-ink">
                  {active.intro}
                </p>
              )}
              <ul className="flex flex-col gap-2">
                {active.items.map((item) => (
                  <li
                    key={item.title}
                    className="rounded-2xl border border-line bg-paper px-3 py-3 shadow-soft"
                  >
                    <p className="font-display text-base leading-none text-ink">{item.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
