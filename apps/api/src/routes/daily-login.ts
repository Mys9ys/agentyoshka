import type { FastifyInstance } from 'fastify';
import { toAgentProfile } from '../lib/agent-map.js';
import { dateKeyFromDate } from '../lib/day-config.js';
import { getRequestAgent } from '../lib/auth.js';
import { grantHardwareDrop } from '../lib/machine.js';
import { prisma } from '../lib/prisma.js';
import {
  loginRewardForStreakDay,
  loginRewardTable,
  tickStatus,
} from '../lib/tick.js';

function yesterdayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() - 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export async function dailyLoginRoutes(app: FastifyInstance) {
  app.get('/demo/daily-login', async (req, reply) => {
    try {
      const { agent } = await getRequestAgent(req);
      const dateKey = dateKeyFromDate();
      const claimedToday = agent.lastLoginClaimDateKey === dateKey;
      const table = loginRewardTable();

      let nextStreakDay = 1;
      if (agent.lastLoginClaimDateKey) {
        const y = yesterdayKey(dateKey);
        if (agent.lastLoginClaimDateKey === y) {
          nextStreakDay = agent.loginStreak + 1;
        } else if (agent.lastLoginClaimDateKey === dateKey) {
          nextStreakDay = agent.loginStreak;
        } else {
          nextStreakDay = 1;
        }
      }

      const preview = loginRewardForStreakDay(
        claimedToday ? agent.loginStreak : nextStreakDay,
      );

      return {
        ok: true,
        dateKey,
        claimedToday,
        loginStreak: agent.loginStreak,
        nextStreakDay: claimedToday ? agent.loginStreak : nextStreakDay,
        todayReward: claimedToday
          ? table.find((r) => r.day === agent.loginStreak) ?? preview
          : preview,
        rewardTable: table,
        tick: tickStatus(agent),
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'База недоступна' });
    }
  });

  app.post('/demo/daily-login/claim', async (req, reply) => {
    try {
      const { agent } = await getRequestAgent(req);
      const dateKey = dateKeyFromDate();

      if (agent.lastLoginClaimDateKey === dateKey) {
        return reply.status(409).send({ ok: false, error: 'Награда за сегодня уже получена' });
      }

      const y = yesterdayKey(dateKey);
      let newStreak = 1;
      if (agent.lastLoginClaimDateKey === y) {
        newStreak = agent.loginStreak + 1;
      }

      const reward = loginRewardForStreakDay(newStreak);
      const purchases = await prisma.agentPurchase.findMany({
        where: { agentId: agent.id },
        select: { itemId: true },
      });
      const ownedIds = new Set(purchases.map((p) => p.itemId));

      const result = await prisma.$transaction(async (tx) => {
        let dropGranted = false;
        if (reward.hardwareDrop) {
          dropGranted = await grantHardwareDrop(
            tx,
            agent.id,
            reward.hardwareDrop,
            ownedIds,
          );
        }

        await tx.dailyLoginClaim.create({
          data: {
            agentId: agent.id,
            dateKey,
            streakDay: newStreak,
            coinsGranted: reward.coins,
            hardwareDrop: dropGranted ? reward.hardwareDrop : null,
          },
        });

        const updated = await tx.agent.update({
          where: { id: agent.id },
          data: {
            coins: { increment: reward.coins },
            loginStreak: newStreak,
            lastLoginDateKey: dateKey,
            lastLoginClaimDateKey: dateKey,
          },
        });

        return { updated, dropGranted };
      });

      return {
        ok: true,
        coins: result.updated.coins,
        agent: toAgentProfile(result.updated),
        loginStreak: newStreak,
        granted: {
          coins: reward.coins,
          hardwareDrop: result.dropGranted ? reward.hardwareDrop : null,
          label: reward.label,
        },
        tick: tickStatus(result.updated),
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'Не удалось забрать награду' });
    }
  });
}
