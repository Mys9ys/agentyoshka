import { useState } from 'react';
import type { AgentProfile } from '@agentyoshka/shared';
import { apiFetch } from '../lib/api';
import { markFirstRunDone } from '../lib/onboarding';
import { AgentAvatar } from './AgentAvatar';
import { btnPrimary, btnSecondary, Sheet } from '../design-system/ui';

type Props = {
  open: boolean;
  skinId: string;
  onDone: (agent?: AgentProfile, coins?: number) => void;
};

export function OnboardingSheet({ open, skinId, onDone }: Props) {
  const [name, setName] = useState('Агентёшка');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function finish(skipName = false) {
    setBusy(true);
    setError(null);
    try {
      const trimmed = name.trim().slice(0, 24);
      if (!skipName && trimmed && trimmed !== 'Агентёшка') {
        const res = await apiFetch('/demo/agent/rename', {
          method: 'POST',
          body: JSON.stringify({ displayName: trimmed }),
        });
        const json = (await res.json()) as {
          error?: string;
          agent?: AgentProfile;
          coins?: number;
        };
        if (!res.ok) throw new Error(json.error ?? 'Не удалось назвать');
        markFirstRunDone();
        onDone(json.agent, json.coins);
        return;
      }
      markFirstRunDone();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Привет!"
      subtitle="Ты растишь мультяшного ИИ-агента. Сценарий по дням — не открытый чат."
      onClose={() => void finish(true)}
      closeLabel="Позже"
      zClass="z-[60]"
    >
      <div className="mb-4 flex flex-col items-center">
        <AgentAvatar skinId={skinId} pose="joy" playIntro />
      </div>

      <p className="mb-3 text-sm leading-relaxed text-ink-soft">
        Забери дейлик, загляни в пул и аркаду. Гость — на этом устройстве; ник+пароль сохранят
        прогресс.
      </p>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-bold text-ink-soft">Как зовут мишку?</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          className="w-full rounded-2xl border border-line bg-paper px-3 py-3 text-base font-semibold text-ink outline-none focus:border-peach"
          placeholder="Агентёшка"
        />
      </label>

      {error && (
        <p className="mb-2 rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button type="button" disabled={busy} className={btnPrimary} onClick={() => void finish(false)}>
          {busy ? '…' : 'Поехали'}
        </button>
        <button
          type="button"
          disabled={busy}
          className={btnSecondary}
          onClick={() => void finish(true)}
        >
          Оставить «Агентёшка»
        </button>
      </div>
    </Sheet>
  );
}
