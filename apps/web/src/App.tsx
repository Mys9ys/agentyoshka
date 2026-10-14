import { useCallback, useEffect, useState } from 'react';
import type {
  AgentProfile,
  AgentReplyResponse,
  DemoAgentResponse,
  LessonChoiceKey,
} from '@agentyoshka/shared';
import { apiFetch, apiUrl, ensureGuestSession } from './lib/api';
import { ART, ArtIcon, btnPrimary, btnSecondary, CoinPill, Sheet } from './design-system/ui';
import { AgentAvatar, type BearPose } from './components/AgentAvatar';
import { AuthPanel } from './components/AuthPanel';
import { BotProfilePage } from './components/BotProfilePage';
import { DailyLoginCard } from './components/DailyLoginCard';
import { FeedPanel } from './components/FeedPanel';
import { HelpPanel } from './components/HelpPanel';
import { MachinePanel } from './components/MachinePanel';
import { MinigamesHub } from './components/MinigamesHub';
import { ProductionPanel } from './components/ProductionPanel';
import { ShopPanel } from './components/ShopPanel';
import { CatchCoinsGame } from './minigames/catch-coins/CatchCoinsGame';
import { MemoryPairsGame } from './minigames/memory-pairs/MemoryPairsGame';
import { SnakeMiniGame } from './minigames/snake-mini/SnakeMiniGame';
import { TapRhythmGame } from './minigames/tap-rhythm/TapRhythmGame';

type TodayPayload = {
  weekday: string;
  day: {
    id?: string;
    title?: string;
    intro?: { speaker: string; text: string }[];
    lessonChoice?: { a: { label: string }; b: { label: string } };
    minigame?: string;
    socialHint?: string;
  };
};

export default function App() {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [coins, setCoins] = useState(0);
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [todayProgress, setTodayProgress] = useState<DemoAgentResponse['today'] | null>(null);
  const [scenarioWeekday, setScenarioWeekday] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<LessonChoiceKey | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [minigameOpen, setMinigameOpen] = useState(false);
  const [minigameSaving, setMinigameSaving] = useState(false);
  const calendarMinigameId =
    todayProgress?.minigameId ?? today?.day.minigame ?? null;
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [agentReply, setAgentReply] = useState<string | null>(null);
  const [replyMeta, setReplyMeta] = useState<{
    source?: string;
    regensLeft?: number;
  } | null>(null);
  const [replyLoading, setReplyLoading] = useState(false);
  const [dailyCompleting, setDailyCompleting] = useState(false);
  const [productionTick, setProductionTick] = useState(0);
  const [machineOpen, setMachineOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authInfo, setAuthInfo] = useState<{ isGuest: boolean; handle: string | null }>({
    isGuest: true,
    handle: null,
  });
  const [screen, setScreen] = useState<'home' | 'pool' | 'arcade' | 'feed'>('home');

  const loadData = useCallback(async () => {
    const session = await ensureGuestSession();
    setAuthInfo({ isGuest: session.isGuest, handle: session.handle });
    const [agentRes, calRes] = await Promise.all([
      apiFetch('/demo/agent'),
      apiFetch('/calendar/today'),
    ]);
    if (!agentRes.ok || !calRes.ok) {
      throw new Error('API недоступен');
    }
    const agentJson = (await agentRes.json()) as DemoAgentResponse & {
      scenarioWeekday?: string;
    };
    const calJson = (await calRes.json()) as TodayPayload;
    setAgent(agentJson.agent);
    setCoins(agentJson.coins);
    setTodayProgress(agentJson.today);
    setScenarioWeekday(agentJson.scenarioWeekday ?? calJson.weekday);
    setToday(calJson);
    if (agentJson.source === 'fallback') {
      setError('База офлайн — прогресс не сохранится. Проверь API и SQLite (apps/api/.env).');
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
              ? `${e.message}. Страница: ${window.location.origin} · API: ${apiUrl('/health')}`
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

  const fetchAgentReply = useCallback(async (regenerate = false) => {
    setReplyLoading(true);
    try {
      const res = await apiFetch('/demo/agent-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot: 'day_intro', regenerate }),
      });
      const json = (await res.json()) as AgentReplyResponse;
      if (!res.ok || !json.ok || !json.text) {
        return;
      }
      setAgentReply(json.text);
      setReplyMeta({ source: json.source, regensLeft: json.regensLeft });
    } catch {
      /* шаблон из calendar остаётся */
    } finally {
      setReplyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!agent || loading) return;
    void fetchAgentReply(false);
  }, [agent?.id, loading, fetchAgentReply]);

  async function pickLesson(choice: LessonChoiceKey) {
    setSubmitting(choice);
    setToast(null);
    try {
      const res = await apiFetch('/demo/lesson-choice', {
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
      setToast(`Урок записан! +${xp} XP, +${c} 🪙 · идея ушла в пул`);
      void fetchAgentReply(false);
      setProductionTick((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSubmitting(null);
    }
  }

  async function completeDaily() {
    setDailyCompleting(true);
    setToast(null);
    try {
      const res = await apiFetch('/demo/daily-complete', { method: 'POST' });
      const json = (await res.json()) as {
        error?: string;
        agent?: AgentProfile;
        coins?: number;
        today?: DemoAgentResponse['today'];
        reward?: { cultureXp?: number; coins?: number };
      };
      if (!res.ok) throw new Error(json.error ?? 'Не удалось завершить день');
      if (json.agent) setAgent(json.agent);
      if (typeof json.coins === 'number') setCoins(json.coins);
      if (json.today) setTodayProgress(json.today);
      const c = json.reward?.coins ?? 0;
      setToast(`Запущено в пул! Мгновенно +${c} 🪙 · доход капает дальше`);
      void fetchAgentReply(false);
      setProductionTick((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setDailyCompleting(false);
    }
  }

  async function submitMinigameScore(score: number) {
    const minigameId = todayProgress?.minigameId ?? today?.day.minigame;
    if (!minigameId) return;

    setMinigameSaving(true);
    setToast(null);
    try {
      const res = await apiFetch('/demo/minigame-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minigameId, score }),
      });
      const json = (await res.json()) as {
        error?: string;
        agent?: AgentProfile;
        coins?: number;
        today?: DemoAgentResponse['today'];
        reward?: { coins?: number };
      };

      if (!res.ok) {
        throw new Error(json.error ?? 'Не удалось сохранить результат');
      }

      setMinigameOpen(false);
      if (json.agent) setAgent(json.agent);
      if (typeof json.coins === 'number') setCoins(json.coins);
      if (json.today) setTodayProgress(json.today);
      setToast(`Аркада пройдена! +${json.reward?.coins ?? 0} 🪙 · модуль в пуле`);
      void fetchAgentReply(false);
      setProductionTick((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setMinigameSaving(false);
    }
  }

  const dayCompleted = todayProgress?.completed === true;

  const narratorLine =
    today?.day.intro
      ?.filter((x) => x.speaker === 'narrator')
      .map((x) => x.text)
      .join(' ') ?? '';
  const agentYamlLine =
    today?.day.intro
      ?.filter((x) => x.speaker === 'agent')
      .map((x) => x.text)
      .join(' ') || 'Привет! Я твой Агентёшка.';
  const agentLine = agentReply ?? agentYamlLine;

  const lessonDone = dayCompleted;
  const lessonAvailable = Boolean(today?.day.lessonChoice && todayProgress?.hasLessonChoice);
  const minigameAvailable = Boolean(todayProgress?.hasMinigame && calendarMinigameId);
  const minigameDone = minigameAvailable && dayCompleted;
  const calendarGameTitle: Record<string, string> = {
    catch_coins: 'поймать монетки',
    tap_rhythm: 'ритм-тапы',
    snake_mini: 'змейку',
    memory_pairs: 'пары карточек',
  };
  const genericDayAvailable =
    !lessonAvailable && !minigameAvailable && !dayCompleted && Boolean(todayProgress?.eventId);

  const pose: BearPose = replyLoading ? 'think' : toast ? 'joy' : 'idle';

  const dock = [
    { label: 'Пул', icon: 'pool' as const, onClick: () => setScreen('pool') },
    { label: 'Лента', icon: 'book' as const, onClick: () => setScreen('feed') },
    { label: 'Сервер', icon: 'server' as const, onClick: () => setMachineOpen(true) },
    { label: 'Магазин', icon: 'shop' as const, onClick: () => setShopOpen(true) },
    { label: 'Аркада', icon: 'arcade' as const, onClick: () => setScreen('arcade') },
  ];

  return (
    <div className="relative mx-auto min-h-[100dvh] max-w-md bg-cream text-ink">
      {(toast || error) && (
        <div className="pointer-events-none fixed inset-x-0 top-[max(0.6rem,env(safe-area-inset-top))] z-[70] mx-auto w-full max-w-md px-4">
          {error && (
            <p className="pointer-events-auto mb-2 rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger shadow-card">
              {error}
            </p>
          )}
          {toast && (
            <p className="pointer-events-auto rounded-2xl bg-leaf-soft p-3 text-sm font-semibold text-ink shadow-card">
              {toast}
            </p>
          )}
        </div>
      )}

      {screen === 'home' && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
            <img
              src={ART.homeBg}
              alt=""
              className="h-full w-full object-cover object-[center_18%]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-cream/45 to-cream" />
          </div>

          <main className="relative flex min-h-[100dvh] flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
            <header className="flex items-center justify-between gap-3">
              <h1 className="font-display text-[1.85rem] leading-none tracking-tight text-ink">
                Агентёшка
              </h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="rounded-full border border-line bg-paper px-2.5 py-2 text-xs font-bold text-ink shadow-soft active:scale-[0.98]"
                  aria-label="Аккаунт"
                  title="Аккаунт"
                >
                  {authInfo.isGuest ? 'Гость' : `@${authInfo.handle}`}
                </button>
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper font-display text-lg font-bold leading-none text-ink shadow-soft active:scale-[0.98]"
                  aria-label="Как играть"
                  title="Как играть"
                >
                  ?
                </button>
                <CoinPill coins={coins} />
              </div>
            </header>
            {loading && (
              <div className="flex flex-1 flex-col items-center justify-center">
                <AgentAvatar skinId="bear_cream" pose="think" />
                <p className="text-center text-sm font-semibold text-ink-soft">
                  Загружаем сценарий дня…
                </p>
              </div>
            )}

            {!loading && !agent && (
              <div className="flex flex-1 flex-col items-center justify-center">
                <AgentAvatar skinId="bear_cream" pose="idle" />
              </div>
            )}

            {agent && (
              <>
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="flex flex-col items-center active:scale-[0.99]"
                >
                  <AgentAvatar skinId={agent.baseSkinId} pose={pose} playIntro />
                  <span className="font-display text-lg leading-none text-ink">{agent.displayName}</span>
                  <span className="text-xs font-semibold text-ink-soft">
                    Ур. {agent.level} · {agent.trainingGrade} · XP {agent.cultureXp}
                    {agent.cultureTrack !== 'neutral' ? ` · ${agent.cultureTrack}` : ''}
                  </span>
                </button>

                <section className="rounded-card border border-line bg-paper/95 p-4 shadow-card">
                  <p className="mb-1 font-display text-sm text-peach-deep">
                    {today?.day.title ?? 'Сегодня'}
                  </p>
                  <p className="font-display text-lg leading-snug text-ink">
                    {replyLoading && !agentReply ? 'Агентёшка думает…' : agentLine}
                  </p>
                  {narratorLine ? (
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{narratorLine}</p>
                  ) : null}
                  {today?.day.socialHint && (
                    <p className="mt-2 text-sm font-semibold text-teal">{today.day.socialHint}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {replyMeta?.source && (
                      <span className="text-[11px] font-semibold text-ink-soft">
                        голос · {replyMeta.source === 'llm' ? 'свой' : 'шаблон'}
                      </span>
                    )}
                    {(replyMeta?.regensLeft ?? 0) > 0 && (
                      <button
                        type="button"
                        disabled={replyLoading}
                        onClick={() => void fetchAgentReply(true)}
                        className="text-xs font-bold text-peach-deep disabled:opacity-50"
                      >
                        Перефразировать ({replyMeta?.regensLeft})
                      </button>
                    )}
                  </div>
                  {scenarioWeekday && scenarioWeekday !== today?.weekday && (
                    <p className="mt-1 text-[10px] text-ink-soft">Сценарий: {scenarioWeekday}</p>
                  )}
                </section>

                {lessonAvailable &&
                  (lessonDone ? (
                    <p className="rounded-2xl bg-leaf-soft px-4 py-3 text-sm font-semibold text-ink">
                      Урок на сегодня уже выбран
                      {todayProgress?.choiceKey
                        ? `: «${today!.day.lessonChoice![todayProgress.choiceKey].label}»`
                        : '.'}
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      <button
                        type="button"
                        disabled={submitting !== null}
                        onClick={() => void pickLesson('a')}
                        className={`${btnPrimary} flex items-center gap-3 text-left`}
                      >
                        <ArtIcon name="book" className="h-10 w-10 object-contain" />
                        <span>{submitting === 'a' ? 'Сохраняем…' : today!.day.lessonChoice!.a.label}</span>
                      </button>
                      <button
                        type="button"
                        disabled={submitting !== null}
                        onClick={() => void pickLesson('b')}
                        className={`${btnSecondary} text-left`}
                      >
                        {submitting === 'b' ? 'Сохраняем…' : today!.day.lessonChoice!.b.label}
                      </button>
                    </div>
                  ))}

                {genericDayAvailable && (
                  <button
                    type="button"
                    disabled={dailyCompleting}
                    onClick={() => void completeDaily()}
                    className={btnPrimary}
                  >
                    {dailyCompleting ? 'Запускаем…' : 'Запустить идею дня в пул'}
                  </button>
                )}

                {dayCompleted && !lessonAvailable && !minigameAvailable && (
                  <p className="rounded-2xl bg-leaf-soft px-4 py-3 text-sm font-semibold text-ink">
                    Ивент дня закрыт — доход капает в пуле.
                  </p>
                )}

                {minigameAvailable &&
                  (minigameDone ? (
                    <p className="rounded-2xl bg-leaf-soft px-4 py-3 text-sm font-semibold text-ink">
                      Аркада дня пройдена
                      {todayProgress?.minigameScore != null
                        ? ` · поймано ${todayProgress.minigameScore}`
                        : ''}
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={minigameSaving}
                      onClick={() => setMinigameOpen(true)}
                      className={`${btnPrimary} flex items-center justify-center gap-2`}
                    >
                      <ArtIcon name="arcade" className="h-9 w-9 object-contain" />
                      {minigameSaving
                        ? 'Сохраняем…'
                        : `Играть: ${calendarGameTitle[calendarMinigameId!] ?? calendarMinigameId}`}
                    </button>
                  ))}

                <DailyLoginCard
                  onClaimed={(c, a) => {
                    setCoins(c);
                    if (a) setAgent(a);
                    setProductionTick((n) => n + 1);
                  }}
                />

                <nav className="mt-auto grid grid-cols-5 gap-1.5 pt-1">
                  {dock.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.onClick}
                      className="flex min-h-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-card border border-line bg-paper px-0.5 py-2 shadow-soft active:scale-[0.98]"
                    >
                      <ArtIcon name={item.icon} className="h-9 w-9 object-contain" />
                      <span className="text-[0.65rem] font-bold leading-tight text-ink">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </nav>
              </>
            )}
          </main>
        </>
      )}

      {screen === 'pool' && (
        <Sheet
          title="Пул"
          subtitle="Слоты дохода. Собрать или ускорить."
          onClose={() => setScreen('home')}
        >
          <ProductionPanel
            key={productionTick}
            embedded
            onCoinsChange={(c, a) => {
              setCoins(c);
              if (a) setAgent(a);
            }}
          />
        </Sheet>
      )}

      {screen === 'arcade' && (
        <Sheet
          title="Аркада"
          subtitle="Мини-игры, которые уже можно поиграть."
          onClose={() => setScreen('home')}
        >
          <MinigamesHub
            embedded
            onReward={(c, a, msg) => {
              setCoins(c);
              if (a) setAgent(a);
              if (msg) setToast(msg);
            }}
          />
        </Sheet>
      )}

      {screen === 'feed' && (
        <Sheet
          title="Лента"
          subtitle="Релизы соседских агентов — сыграй и забери монеты."
          onClose={() => setScreen('home')}
        >
          <FeedPanel
            onReward={(c, a, msg) => {
              setCoins(c);
              if (a) setAgent(a);
              if (msg) setToast(msg);
            }}
          />
        </Sheet>
      )}

      <BotProfilePage
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onAgentChange={(a, c) => {
          setAgent(a);
          setCoins(c);
        }}
      />

      <MachinePanel open={machineOpen} onClose={() => setMachineOpen(false)} />

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />

      <AuthPanel
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        auth={authInfo}
        onAuthed={({ agent: a, coins: c, auth }) => {
          setAgent(a);
          setCoins(c);
          setAuthInfo(auth);
          setProductionTick((n) => n + 1);
          void loadData();
        }}
      />

      <ShopPanel
        open={shopOpen}
        onClose={() => setShopOpen(false)}
        onUpdated={(a, c) => {
          setAgent(a);
          setCoins(c);
          setProductionTick((n) => n + 1);
        }}
      />

      {minigameOpen && !minigameDone && calendarMinigameId === 'catch_coins' && (
        <CatchCoinsGame
          onClose={() => setMinigameOpen(false)}
          onWin={(score) => void submitMinigameScore(score)}
        />
      )}
      {minigameOpen && !minigameDone && calendarMinigameId === 'tap_rhythm' && (
        <TapRhythmGame
          onClose={() => setMinigameOpen(false)}
          onWin={(score) => void submitMinigameScore(score)}
        />
      )}
      {minigameOpen && !minigameDone && calendarMinigameId === 'snake_mini' && (
        <SnakeMiniGame
          onClose={() => setMinigameOpen(false)}
          onWin={(score) => void submitMinigameScore(score)}
        />
      )}
      {minigameOpen && !minigameDone && calendarMinigameId === 'memory_pairs' && (
        <MemoryPairsGame
          onClose={() => setMinigameOpen(false)}
          onWin={(score) => void submitMinigameScore(score)}
        />
      )}
    </div>
  );
}
