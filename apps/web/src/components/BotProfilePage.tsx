import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentProfile, TechBranchView, VoiceProfile } from '@agentyoshka/shared';
import { VoiceProfileCard } from './VoiceProfileCard';
import { apiFetch } from '../lib/api';
import { CoinPill, Sheet, btnGhost } from '../design-system/ui';
import { AgentAvatar } from './AgentAvatar';
import { TechTreeView } from './TechTreeView';

type ProfilePayload = {
  agent: AgentProfile;
  coins: number;
  skin: { id: string; label: string };
  bio: string;
  wardrobe: { skinId: string; label: string; owned: boolean; equipped: boolean }[];
  upgrades: {
    itemId: string;
    kind: string;
    label: string;
    description: string;
    purchasedAt: string;
    effect: { cultureXp?: number; level?: number } | null;
  }[];
  techBranches: TechBranchView[];
  voice: VoiceProfile;
};

type BotProfilePageProps = {
  open: boolean;
  onClose: () => void;
  onAgentChange?: (agent: AgentProfile, coins: number) => void;
};

export function BotProfilePage({ open, onClose, onAgentChange }: BotProfilePageProps) {
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipBusy, setEquipBusy] = useState<string | null>(null);
  const onAgentChangeRef = useRef(onAgentChange);
  onAgentChangeRef.current = onAgentChange;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/demo/profile');
      if (!res.ok) throw new Error('Не удалось загрузить профиль');
      const json = (await res.json()) as ProfilePayload;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    void load(false);
  }, [open, load]);

  async function equipSkin(skinId: string) {
    setEquipBusy(skinId);
    setError(null);
    try {
      const res = await apiFetch('/demo/shop/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinId }),
      });
      const json = (await res.json()) as { error?: string; agent?: AgentProfile };
      if (!res.ok) throw new Error(json.error ?? 'Не удалось сменить образ');
      if (json.agent) {
        onAgentChangeRef.current?.(json.agent, data?.coins ?? 0);
      }
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setEquipBusy(null);
    }
  }

  if (!open) return null;

  const agent = data?.agent;
  const initialLoad = loading && !data;

  return (
    <Sheet
      title="Профиль"
      subtitle={agent?.displayName}
      onClose={onClose}
      trailing={data ? <CoinPill coins={data.coins} /> : undefined}
    >
      {initialLoad && <p className="text-sm text-ink-soft">Загружаем…</p>}
      {error && <p className="rounded-2xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}

      {agent && data && (
        <div className="flex flex-col gap-4">
          <AgentAvatar skinId={agent.baseSkinId} size="lg" pose="idle" />
          <div className="text-center">
            <p className="font-display text-2xl text-ink">{agent.displayName}</p>
            <p className="text-sm text-ink-soft">
              Ур. {agent.level} · {agent.trainingGrade} · XP {agent.cultureXp}
            </p>
            <p className="mt-1 text-sm font-bold text-ink-soft">{data.skin.label}</p>
          </div>

          <section className="rounded-card border border-line bg-paper p-4 shadow-card">
            <p className="mb-1 font-display text-lg text-ink">Личность</p>
            <p className="text-sm leading-relaxed text-ink">{data.bio}</p>
          </section>

          <VoiceProfileCard voice={data.voice} />

          {data.wardrobe.some((w) => w.owned) && (
            <section className="rounded-card border border-line bg-paper p-4 shadow-card">
              <p className="mb-2 font-display text-lg text-ink">Образ</p>
              <ul className="flex flex-col gap-2">
                {data.wardrobe
                  .filter((w) => w.owned)
                  .map((w) => (
                    <li
                      key={w.skinId}
                      className="flex items-center justify-between gap-2 rounded-2xl bg-cream px-3 py-2"
                    >
                      <span className="text-sm font-bold text-ink">
                        {w.label}
                        {w.equipped ? (
                          <span className="ml-2 text-xs font-bold text-leaf">надет</span>
                        ) : null}
                      </span>
                      {!w.equipped && (
                        <button
                          type="button"
                          disabled={equipBusy != null}
                          className={btnGhost}
                          onClick={() => void equipSkin(w.skinId)}
                        >
                          {equipBusy === w.skinId ? '…' : 'Надеть'}
                        </button>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
          )}

          <section>
            <p className="mb-2 font-display text-lg text-ink">Ветки навыков</p>
            <TechTreeView
              branches={data.techBranches}
              mode="profile"
              busyId={equipBusy}
              onEquip={(skinId) => void equipSkin(skinId)}
            />
          </section>
        </div>
      )}
    </Sheet>
  );
}
