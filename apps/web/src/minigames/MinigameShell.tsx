import type { ReactNode } from 'react';

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function MinigameShell({ title, onClose, children }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cream px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-xl text-ink">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-bold text-ink shadow-soft"
        >
          Закрыть
        </button>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden rounded-card border border-line bg-paper p-3 shadow-card">
        {children}
      </div>
    </div>
  );
}
