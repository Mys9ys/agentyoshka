import type { FastifyInstance } from 'fastify';
import {
  createGuestUser,
  loginAccount,
  logoutToken,
  publicAuthUser,
  registerAccount,
  resolveUserFromRequest,
} from '../lib/auth.js';
import { toAgentProfile } from '../lib/agent-map.js';

function errStatus(err: unknown): number {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const n = Number((err as { statusCode: number }).statusCode);
    if (Number.isFinite(n)) return n;
  }
  return 500;
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/guest', async (req, reply) => {
    try {
      const existing = await resolveUserFromRequest(req);
      if (existing) {
        return {
          ok: true,
          reused: true,
          token: existing.token,
          auth: publicAuthUser(existing.user, existing.agent),
          agent: toAgentProfile(existing.agent),
          coins: existing.agent.coins,
        };
      }
      const created = await createGuestUser();
      return {
        ok: true,
        reused: false,
        token: created.token,
        expiresAt: created.expiresAt.toISOString(),
        auth: publicAuthUser(created.user, created.agent),
        agent: toAgentProfile(created.agent),
        coins: created.agent.coins,
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'Не удалось создать гостя' });
    }
  });

  app.post<{ Body: { handle?: string; password?: string } }>('/auth/register', async (req, reply) => {
    const handle = req.body?.handle ?? '';
    const password = req.body?.password ?? '';
    const guestToken =
      (typeof req.headers.authorization === 'string' &&
        req.headers.authorization.startsWith('Bearer ') &&
        req.headers.authorization.slice(7).trim()) ||
      null;

    try {
      const result = await registerAccount({ handle, password, guestToken });
      return {
        ok: true,
        token: result.token,
        expiresAt: result.expiresAt.toISOString(),
        auth: publicAuthUser(result.user, result.agent),
        agent: toAgentProfile(result.agent),
        coins: result.agent.coins,
      };
    } catch (err) {
      const status = errStatus(err);
      if (status < 500) {
        return reply.status(status).send({
          ok: false,
          error: err instanceof Error ? err.message : 'Ошибка регистрации',
        });
      }
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'База недоступна' });
    }
  });

  app.post<{ Body: { handle?: string; password?: string } }>('/auth/login', async (req, reply) => {
    const handle = req.body?.handle ?? '';
    const password = req.body?.password ?? '';
    try {
      const result = await loginAccount({ handle, password });
      return {
        ok: true,
        token: result.token,
        expiresAt: result.expiresAt.toISOString(),
        auth: publicAuthUser(result.user, result.agent),
        agent: toAgentProfile(result.agent),
        coins: result.agent.coins,
      };
    } catch (err) {
      const status = errStatus(err);
      if (status < 500) {
        return reply.status(status).send({
          ok: false,
          error: err instanceof Error ? err.message : 'Ошибка входа',
        });
      }
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'База недоступна' });
    }
  });

  app.post('/auth/logout', async (req, reply) => {
    try {
      const token =
        (typeof req.headers.authorization === 'string' &&
          req.headers.authorization.startsWith('Bearer ') &&
          req.headers.authorization.slice(7).trim()) ||
        null;
      await logoutToken(token);
      return { ok: true };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'База недоступна' });
    }
  });

  app.get('/auth/me', async (req, reply) => {
    try {
      const session = await resolveUserFromRequest(req);
      if (!session) {
        return reply.status(401).send({ ok: false, error: 'Нет сессии' });
      }
      return {
        ok: true,
        auth: publicAuthUser(session.user, session.agent),
        agent: toAgentProfile(session.agent),
        coins: session.agent.coins,
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({ ok: false, error: 'База недоступна' });
    }
  });
}
