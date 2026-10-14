import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Agent, User } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { parsePersonality, persistPersonality, seedPersonality } from './personality.js';
import { prisma } from './prisma.js';

const SESSION_DAYS = 60;
const HANDLE_RE = /^[a-zA-Z0-9_]{3,20}$/;

export type AuthUser = User & { agent: Agent };

function hashPassword(password: string, salt: Buffer): string {
  const hash = scryptSync(password, salt, 32);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function createPasswordHash(password: string): string {
  return hashPassword(password, randomBytes(16));
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, salt, 32);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateHandle(handle: string): string | null {
  if (!HANDLE_RE.test(handle)) {
    return 'Ник: 3–20 символов, латиница/цифры/_';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return 'Пароль минимум 6 символов';
  if (password.length > 72) return 'Пароль слишком длинный';
  return null;
}

function newToken(): string {
  return randomBytes(32).toString('hex');
}

async function ensureAgentPersonality(agent: Agent): Promise<Agent> {
  if (agent.personalityJson == null) {
    await persistPersonality(agent.id, seedPersonality(agent.id));
    return prisma.agent.findUniqueOrThrow({ where: { id: agent.id } });
  }
  parsePersonality(agent);
  return agent;
}

async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  await prisma.session.create({
    data: { token, userId, expiresAt },
  });
  return { token, expiresAt };
}

export async function createGuestUser(): Promise<{
  user: AuthUser;
  agent: Agent;
  token: string;
  expiresAt: Date;
}> {
  const id = randomBytes(6).toString('hex');
  const email = `guest_${id}@agentyoshka.local`;
  const user = await prisma.user.create({
    data: {
      email,
      isGuest: true,
      agent: {
        create: {
          displayName: 'Агентёшка',
          baseSkinId: 'bear_cream',
        },
      },
    },
    include: { agent: true },
  });
  if (!user.agent) throw new Error('Guest has no agent');
  const agent = await ensureAgentPersonality(user.agent);
  const session = await createSession(user.id);
  return {
    user: { ...user, agent },
    agent,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

export async function registerAccount(opts: {
  handle: string;
  password: string;
  /** Если есть гостевая сессия — апгрейд того же юзера (прогресс сохраняется). */
  guestToken?: string | null;
}): Promise<{ user: AuthUser; agent: Agent; token: string; expiresAt: Date }> {
  const handle = normalizeHandle(opts.handle);
  const handleErr = validateHandle(handle);
  if (handleErr) throw Object.assign(new Error(handleErr), { statusCode: 400 });
  const passErr = validatePassword(opts.password);
  if (passErr) throw Object.assign(new Error(passErr), { statusCode: 400 });

  const taken = await prisma.user.findUnique({ where: { handle } });
  if (taken) {
    throw Object.assign(new Error('Ник уже занят'), { statusCode: 409 });
  }

  const passwordHash = createPasswordHash(opts.password);
  const email = `${handle}@players.agentyoshka.local`;

  let userId: string | null = null;
  if (opts.guestToken) {
    const guestSession = await prisma.session.findUnique({
      where: { token: opts.guestToken },
      include: { user: true },
    });
    if (
      guestSession &&
      guestSession.expiresAt > new Date() &&
      guestSession.user.isGuest &&
      !guestSession.user.handle
    ) {
      userId = guestSession.userId;
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.user.update({
        where: { id: userId },
        data: {
          handle,
          passwordHash,
          email,
          isGuest: false,
        },
      });
    }
  }

  if (!userId) {
    const created = await prisma.user.create({
      data: {
        email,
        handle,
        passwordHash,
        isGuest: false,
        agent: {
          create: {
            displayName: handle,
            baseSkinId: 'bear_cream',
          },
        },
      },
      include: { agent: true },
    });
    userId = created.id;
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { agent: true },
  });
  if (!user.agent) throw new Error('User has no agent');
  const agent = await ensureAgentPersonality(user.agent);
  const session = await createSession(user.id);
  return {
    user: { ...user, agent },
    agent,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

export async function loginAccount(opts: {
  handle: string;
  password: string;
}): Promise<{ user: AuthUser; agent: Agent; token: string; expiresAt: Date }> {
  const handle = normalizeHandle(opts.handle);
  const user = await prisma.user.findUnique({
    where: { handle },
    include: { agent: true },
  });
  if (!user?.passwordHash || !user.agent) {
    throw Object.assign(new Error('Неверный ник или пароль'), { statusCode: 401 });
  }
  if (!verifyPassword(opts.password, user.passwordHash)) {
    throw Object.assign(new Error('Неверный ник или пароль'), { statusCode: 401 });
  }
  const agent = await ensureAgentPersonality(user.agent);
  const session = await createSession(user.id);
  return {
    user: { ...user, agent },
    agent,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

export async function logoutToken(token: string | null | undefined) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { token } });
}

function extractBearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) return h.slice(7).trim() || null;
  const alt = req.headers['x-session-token'];
  if (typeof alt === 'string' && alt.trim()) return alt.trim();
  return null;
}

export async function resolveUserFromRequest(req: FastifyRequest): Promise<{
  user: AuthUser;
  agent: Agent;
  token: string | null;
  auth: 'session' | 'guest-fallback';
} | null> {
  const token = extractBearer(req);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { agent: true } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.agent) {
    return null;
  }
  const agent = await ensureAgentPersonality(session.user.agent);
  return {
    user: { ...session.user, agent },
    agent,
    token,
    auth: 'session',
  };
}

/** Текущий агент: сессия → иначе legacy demo (для скриптов без токена). */
export async function getRequestAgent(req: FastifyRequest): Promise<{
  user: AuthUser;
  agent: Agent;
  auth: 'session' | 'demo';
}> {
  const fromSession = await resolveUserFromRequest(req);
  if (fromSession) {
    return {
      user: fromSession.user,
      agent: fromSession.agent,
      auth: 'session',
    };
  }

  // Legacy shared demo — только без Bearer (curl / старые клиенты)
  const { getOrCreateDemoUser } = await import('./demo-user.js');
  const demo = await getOrCreateDemoUser();
  return {
    user: { ...demo.user, agent: demo.agent },
    agent: demo.agent,
    auth: 'demo',
  };
}

export function publicAuthUser(user: User, agent: Agent) {
  return {
    id: user.id,
    handle: user.handle,
    isGuest: user.isGuest,
    email: user.email.endsWith('@agentyoshka.local') || user.email.endsWith('@players.agentyoshka.local')
      ? undefined
      : user.email,
    agentId: agent.id,
  };
}

/** Стабильный отпечаток для логов без утечки токена. */
export function tokenFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 8);
}
