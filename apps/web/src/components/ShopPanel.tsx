import { useCallback, useEffect, useState } from 'react';
import type { AgentProfile, ShopCatalogResponse, TechBranchView } from '@agentyoshka/shared';
import { apiUrl } from '../lib/api';
import { CoinPill, Sheet } from '../design-system/ui';
import { TechTreeView } from './TechTreeView';

type ShopPanelProps = {
  open: boolean;
  onClose: () => void;
  onUpdated: (agent: AgentProfile, coins: number) => void;
};

export function ShopPanel({ open, onClose, onUpdated }: ShopPanelProps) {
  const [branches, setBranches] = useState<TechBranchView[]>([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadShop = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(apiUrl('/demo/shop'));
      if (!res.ok) throw new Error('Магазин недоступен');
      const json = (await res.json()) as ShopCatalogResponse;
      setBranches(json.techBranches);
      setCoins(json.coins);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadShop();
  }, [open, loadShop]);

  async function purchase(itemId: string) {
    setBusyId(itemId);
    setMessage(null);
    try {
      const res = await fetch(apiUrl('/demo/shop/purchase'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const json = (await res.json()) as {
        error?: string;
        agent?: AgentProfile;
        coins?: number;
        spent?: number;
        techBranches?: TechBranchView[];
      };
      if (!res.ok) throw new Error(json.error ?? 'Не удалось купить');
      if (json.agent && typeof json.coins === 'number') {
        onUpdated(json.agent, json.coins);
        setCoins(json.coins);
      }
      if (json.techBranches) setBranches(json.techBranches);
      else await loadShop();
      setMessage(`Исследовано! −${json.spent ?? 0} 🪙`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  }

  async function equip(skinId: string) {
    setBusyId(`equip:${skinId}`);
    setMessage(null);
    try {
      const res = await fetch(apiUrl('/demo/shop/equip'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinId }),
      });
      const json = (await res.json()) as { error?: string; agent?: AgentProfile };
      if (!res.ok) throw new Error(json.error ?? 'Не удалось надеть');
      if (json.agent) onUpdated(json.agent, coins);
      setMessage('Образ обновлён');
      await loadShop();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  }

  if (!open) return null;

  return (
    <Sheet
      title="Магазин"
      subtitle="Железо и навыки — больше дохода в пуле"
      onClose={onClose}
      trailing={<CoinPill coins={coins} />}
    >
      {message && (
        <p className="mb-3 rounded-2xl bg-honey-soft p-3 text-sm font-semibold text-ink">{message}</p>
      )}

      {loading ? (
        <p className="text-sm text-ink-soft">Открываем полки…</p>
      ) : (
        <TechTreeView
          branches={branches}
          mode="shop"
          busyId={busyId}
          onPurchase={(id) => void purchase(id)}
          onEquip={(id) => void equip(id)}
        />
      )}
    </Sheet>
  );
}
