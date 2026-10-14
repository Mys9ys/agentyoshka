import { useState } from 'react';
import type { AgentProfile } from '@agentyoshka/shared';
import { apiFetch, setSessionToken } from '../lib/api';
import { btnPrimary, btnSecondary, Sheet } from '../design-system/ui';

type AuthInfo = {
  isGuest: boolean;
  handle: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  auth: AuthInfo;
  onAuthed: (opts: {
    agent: AgentProfile;
    coins: number;
    auth: AuthInfo;
  }) => void;
};

export function AuthPanel({ open, onClose, auth, onAuthed }: Props) {
  const [mode, setMode] = useState<'menu' | 'login' | 'register'>(
    auth.isGuest ? 'menu' : 'menu',
  );
  const [handle, setHandle] = useState(auth.handle ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(kind: 'login' | 'register') {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(kind === 'login' ? '/auth/login' : '/auth/register', {
        method: 'POST',
        body: JSON.stringify({ handle, password }),
      });
      const json = (await res.json()) as {
        error?: string;
        token?: string;
        agent?: AgentProfile;
        coins?: number;
        auth?: { isGuest?: boolean; handle?: string | null };
      };
      if (!res.ok || !json.token || !json.agent || typeof json.coins !== 'number') {
        throw new Error(json.error ?? 'Не вышло');
      }
      setSessionToken(json.token);
      onAuthed({
        agent: json.agent,
        coins: json.coins,
        auth: {
          isGuest: Boolean(json.auth?.isGuest),
          handle: json.auth?.handle ?? handle.trim().toLowerCase(),
        },
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  async function logoutToGuest() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/auth/logout', { method: 'POST', body: '{}' });
      setSessionToken(null);
      const res = await apiFetch('/auth/guest', { method: 'POST', body: '{}' });
      const json = (await res.json()) as {
        error?: string;
        token?: string;
        agent?: AgentProfile;
        coins?: number;
        auth?: { isGuest?: boolean; handle?: string | null };
      };
      if (!res.ok || !json.token || !json.agent || typeof json.coins !== 'number') {
        throw new Error(json.error ?? 'Не удалось сменить гостя');
      }
      setSessionToken(json.token);
      onAuthed({
        agent: json.agent,
        coins: json.coins,
        auth: {
          isGuest: true,
          handle: null,
        },
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Аккаунт"
      subtitle={
        auth.isGuest
          ? 'Сейчас гость — прогресс на этом устройстве. Зарегистрируй ник, чтобы не потерять.'
          : `Вошли как @${auth.handle}`
      }
      onClose={onClose}
      zClass="z-50"
    >
      {error && (
        <p className="mb-3 rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {mode === 'menu' && (
        <div className="flex flex-col gap-2">
          {auth.isGuest ? (
            <>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
              >
                Сохранить прогресс (ник + пароль)
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
              >
                Войти в другой аккаунт
              </button>
            </>
          ) : (
            <>
              <p className="rounded-2xl bg-honey-soft px-3 py-2.5 text-sm font-semibold text-ink">
                Прогресс привязан к нику. Можно выйти в нового гостя (старый аккаунт останется).
              </p>
              <button
                type="button"
                className={btnSecondary}
                disabled={busy}
                onClick={() => void logoutToGuest()}
              >
                {busy ? '…' : 'Выйти → новый гость'}
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
              >
                Сменить аккаунт
              </button>
            </>
          )}
        </div>
      )}

      {(mode === 'login' || mode === 'register') && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(mode);
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Ник</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="username"
              className="w-full rounded-2xl border border-line bg-paper px-3 py-3 text-base font-semibold text-ink outline-none focus:border-peach"
              placeholder="misha_bear"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-2xl border border-line bg-paper px-3 py-3 text-base font-semibold text-ink outline-none focus:border-peach"
              placeholder="минимум 6 символов"
            />
          </label>
          {mode === 'register' && auth.isGuest && (
            <p className="text-xs text-ink-soft">
              Гостевой прогресс на этом устройстве перейдёт на новый ник.
            </p>
          )}
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? '…' : mode === 'login' ? 'Войти' : 'Зарегистрировать'}
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={busy}
            onClick={() => {
              setMode('menu');
              setError(null);
            }}
          >
            Назад
          </button>
        </form>
      )}
    </Sheet>
  );
}
