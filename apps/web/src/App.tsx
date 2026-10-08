import { useCallback, useEffect, useState } from 'react';
import type { AgentProfile, DemoAgentResponse, LessonChoiceKey } from '@agentyoshka/shared';
import { apiUrl } from './lib/api';

type TodayPayload = {
  weekday: string;
  day: {
    id?: string;
    title?: string;
    intro?: { speaker: string; text: string }[];
    lessonChoice?: { a: { label: string }; b: { label: string } };
  };
};

function AgentAvatar({ skinId }: { skinId: string }) {
  const palette: Record<string, string> = {
    bear_cream: 'from-amber-100 to-amber-300',
    bear_amber: 'from-orange-200 to-amber-400',
    bear_slate: 'from-slate-300 to-slate-500',
    bear_rose: 'from-pink-200 to-rose-400',
  };
  const grad = palette[skinId] ?? 'from-violet-200 to-indigo-400';

  return (
    <div
      className={`mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br shadow-lg shadow-indigo-900/40 ${grad}`}
      aria-hidden
    >
      <span className="text-5xl">🐻</span>
    </div>
  );
}

export default function App() {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [coins, setCoins] = useState(0);
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [todayProgress, setTodayProgress] = useState<DemoAgentResponse['today'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<LessonChoiceKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
        const [agentRes, calRes] = await Promise.all([
          fetch(apiUrl('/demo/agent')),
          fetch(apiUrl('/calendar/today')),
        ]);
    if (!agentRes.ok || !calRes.ok) {
      throw new Error('API недоступен');
    }
    const agentJson = (await agentRes.json()) as DemoAgentResponse;
    const calJson = (await calRes.json()) as TodayPayload;
    setAgent(agentJson.agent);
    setCoins(agentJson.coins);
    setTodayProgress(agentJson.today);
    setToday(calJson);
    if (agentJson.source === 'fallback') {
      setError('База офлайн — прогресс не сохранится. Запусти Postgres и migrate.');
    } else {
      setError(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await loadData();
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? `${e.message}. Dev: http://127.0.0.1:5173 · API: ${apiUrl('/health')}`
              : 'Ошибка загрузки',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  async function pickLesson(choice: LessonChoiceKey) {
    setSubmitting(choice);
    setToast(null);
    try {
      const res = await fetch(apiUrl('/demo/lesson-choice'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        agent?: AgentProfile;
        coins?: number;
        today?: DemoAgentResponse['today'];
        reward?: { cultureXp?: number; coins?: number };
      };

      if (!res.ok) {
        throw new Error(json.error ?? 'Не удалось сохранить выбор');
      }

      if (json.agent) setAgent(json.agent);
      if (typeof json.coins === 'number') setCoins(json.coins);
      if (json.today) setTodayProgress(json.today);

      const xp = json.reward?.cultureXp ?? 0;
      const c = json.reward?.coins ?? 0;
      setToast(`Урок записан! +${xp} XP, +${c} 🪙`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSubmitting(null);
    }
  }

  const introLine =
    today?.day.intro?.find((x) => x.speaker === 'agent')?.text ??
    'Привет! Я твой Агентёшка.';

  const lessonDone = todayProgress?.completed === true;
  const lessonAvailable = Boolean(today?.day.lessonChoice && todayProgress?.hasLessonChoice);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-indigo-300/80">MVP</p>
          <h1 className="text-xl font-semibold">Агентёшка</h1>
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-sm tabular-nums">
          🪙 {coins}
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4">
        {loading && (
          <p className="text-center text-sm text-slate-400">Загружаем сценарий дня…</p>
        )}
        {error && (
          <p className="rounded-xl bg-rose-500/20 p-3 text-sm text-rose-100">{error}</p>
        )}
        {toast && (
          <p className="rounded-xl bg-emerald-500/20 p-3 text-sm text-emerald-100">{toast}</p>
        )}

        {agent && (
          <>
            <AgentAvatar skinId={agent.baseSkinId} />
            <div className="text-center">
              <p className="text-lg font-medium">{agent.displayName}</p>
              <p className="text-xs text-slate-400">
                Ур. {agent.level} · {agent.trainingGrade} · XP {agent.cultureXp}
                {agent.cultureTrack !== 'neutral' ? ` · ${agent.cultureTrack}` : ''}
              </p>
            </div>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-200/90">
                {today?.day.title ?? 'Сегодня'}
              </p>
              <p className="text-sm leading-relaxed text-slate-100">{introLine}</p>
            </section>

            {lessonAvailable && (
              <div className="grid gap-2">
                {lessonDone ? (
                  <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    Урок на сегодня уже выбран
                    {todayProgress?.choiceKey
                      ? `: «${today!.day.lessonChoice![todayProgress.choiceKey].label}»`
                      : '.'}
                  </p>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => void pickLesson('a')}
                      className="rounded-xl bg-indigo-600 px-4 py-3 text-left text-sm font-medium active:scale-[0.98] disabled:opacity-60"
                    >
                      {submitting === 'a' ? 'Сохраняем…' : today!.day.lessonChoice!.a.label}
                    </button>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => void pickLesson('b')}
                      className="rounded-xl bg-violet-700/80 px-4 py-3 text-left text-sm font-medium active:scale-[0.98] disabled:opacity-60"
                    >
                      {submitting === 'b' ? 'Сохраняем…' : today!.day.lessonChoice!.b.label}
                    </button>
                  </>
                )}
              </div>
            )}

            <p className="mt-auto text-center text-[11px] text-slate-500">
              Книжная ориентация · сценарий из calendar.yaml
            </p>
          </>
        )}
      </main>
    </div>
  );
}
