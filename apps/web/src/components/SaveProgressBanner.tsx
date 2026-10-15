import { btnPrimary, btnSecondary } from '../design-system/ui';
import { markSaveNudgeDone } from '../lib/onboarding';

type Props = {
  visible: boolean;
  onSave: () => void;
  onDismiss: () => void;
};

export function SaveProgressBanner({ visible, onSave, onDismiss }: Props) {
  if (!visible) return null;

  return (
    <section className="rounded-card border border-peach/40 bg-honey-soft p-4 shadow-card">
      <p className="font-display text-base leading-snug text-ink">Сохрани прогресс</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        Ты уже что-то заработал как гость. Ник и пароль — чтобы не потерять монеты и железо.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          className={btnPrimary}
          onClick={() => {
            markSaveNudgeDone();
            onSave();
          }}
        >
          Сохранить (ник + пароль)
        </button>
        <button
          type="button"
          className={btnSecondary}
          onClick={() => {
            markSaveNudgeDone();
            onDismiss();
          }}
        >
          Позже
        </button>
      </div>
    </section>
  );
}
