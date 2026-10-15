import type { ReactNode } from 'react';

export const ART = {
  coin: '/art/icon-coin.png',
  server: '/art/icon-server.png',
  shop: '/art/icon-shop.png',
  pool: '/art/icon-pool.png',
  arcade: '/art/icon-arcade.png',
  daily: '/art/icon-daily.png',
  book: '/art/icon-book.png',
  profile: '/art/icon-profile.png',
  homeBg: '/art/home-bg.jpg',
} as const;

export type ArtName = keyof typeof ART;

export function ArtIcon({
  name,
  className = 'h-11 w-11 object-contain',
}: {
  name: ArtName;
  className?: string;
}) {
  return <img src={ART[name]} alt="" draggable={false} className={className} />;
}

export function CoinPill({ coins }: { coins: number }) {
  return (
    <div className="flex h-9 items-center gap-1 rounded-full border border-line bg-paper py-0 pl-1 pr-2.5 shadow-soft">
      <ArtIcon name="coin" className="h-6 w-6 object-contain" />
      <span className="font-display text-sm tabular-nums leading-none text-ink">{coins}</span>
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card border border-line bg-paper p-4 shadow-card ${className}`}>
      {children}
    </section>
  );
}

export const btnPrimary =
  'w-full rounded-2xl bg-peach px-4 py-3.5 text-base font-bold text-white shadow-soft active:scale-[0.98] disabled:opacity-50';

export const btnSecondary =
  'w-full rounded-2xl border border-line bg-honey-soft px-4 py-3 text-sm font-bold text-ink shadow-soft active:scale-[0.98] disabled:opacity-50';

export const btnGhost =
  'rounded-full border border-line bg-paper px-3 py-2 text-sm font-bold text-ink shadow-soft active:scale-[0.98]';

export function Sheet({
  title,
  subtitle,
  onClose,
  closeLabel = 'Назад',
  trailing,
  children,
  zClass = 'z-40',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeLabel?: string;
  trailing?: ReactNode;
  children: ReactNode;
  zClass?: string;
}) {
  // absolute — только колонка приложения (max-w-md), не весь экран монитора
  return (
    <div className={`absolute inset-0 ${zClass} flex flex-col bg-cream text-ink`}>
      <div className="flex h-full w-full flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[1.65rem] leading-tight text-ink">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm leading-snug text-ink-soft">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {trailing}
            <button type="button" onClick={onClose} className={btnGhost}>
              {closeLabel}
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto pb-2">{children}</div>
      </div>
    </div>
  );
}
