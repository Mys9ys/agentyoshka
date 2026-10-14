import type { FastifyInstance } from 'fastify';
import { weekdayFromDate } from '../lib/calendar.js';
import { dateKeyFromDate, getDayConfig } from '../lib/day-config.js';
import {
  maxReplyRegenerations,
  produceAgentReply,
} from '../lib/agent-reply.js';
import { getOrCreateDemoUser } from '../lib/demo-user.js';
import { buildVoiceProfile } from '../lib/personality.js';
import { prisma } from '../lib/prisma.js';

const DEFAULT_SLOT = 'day_intro';

export async function agentReplyRoutes(app: FastifyInstance) {
  app.post<{
    Body: { slot?: string; regenerate?: boolean };
  }>('/demo/agent-reply', async (req, reply) => {
    const slotId = req.body?.slot?.trim() || DEFAULT_SLOT;
    const regenerate = Boolean(req.body?.regenerate);

    try {
      const { agent } = await getOrCreateDemoUser();
      const weekday = weekdayFromDate();
      const day = getDayConfig(weekday);
      const dateKey = dateKeyFromDate();
      const maxRegens = maxReplyRegenerations();

      const existing = await prisma.agentReply.findUnique({
        where: {
          agentId_dateKey_slotId: { agentId: agent.id, dateKey, slotId },
        },
      });

      if (existing && !regenerate) {
        const voice = buildVoiceProfile(agent);
        return {
          ok: true,
          slotId,
          dateKey,
          text: existing.text,
          source: existing.source as 'template' | 'llm',
          fromCache: true,
          regensLeft: Math.max(0, maxRegens - existing.regensUsed),
          voice: { grade: voice.grade, maxTokens: voice.maxTokens },
        };
      }

      if (existing && regenerate && existing.regensUsed >= maxRegens) {
        return reply.status(429).send({
          ok: false,
          error: 'Лимит перефразирований на сегодня исчерпан',
          regensLeft: 0,
          text: existing.text,
          source: existing.source,
        });
      }

      const produced = await produceAgentReply(agent, weekday, day, slotId);
      const regensUsed = existing && regenerate ? existing.regensUsed + 1 : existing?.regensUsed ?? 0;

      const row = await prisma.agentReply.upsert({
        where: {
          agentId_dateKey_slotId: { agentId: agent.id, dateKey, slotId },
        },
        create: {
          agentId: agent.id,
          dateKey,
          slotId,
          text: produced.text,
          source: produced.source,
          regensUsed: 0,
        },
        update: {
          text: produced.text,
          source: produced.source,
          regensUsed,
        },
      });

      return {
        ok: true,
        slotId,
        dateKey,
        text: row.text,
        source: row.source as 'template' | 'llm',
        fromCache: false,
        regensLeft: Math.max(0, maxRegens - row.regensUsed),
        voice: {
          grade: produced.voice.grade,
          maxTokens: produced.voice.maxTokens,
        },
      };
    } catch (err) {
      req.log.error(err);
      return reply.status(503).send({
        ok: false,
        error: 'Не удалось сгенерировать реплику',
      });
    }
  });
}
