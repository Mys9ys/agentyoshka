import type { FastifyInstance } from 'fastify';
import { loadHowto } from '../lib/howto.js';

export async function howtoRoutes(app: FastifyInstance) {
  app.get('/demo/howto', async (_req, reply) => {
    try {
      const howto = loadHowto();
      return { ok: true, ...howto };
    } catch (err) {
      app.log.error(err);
      return reply.status(503).send({ ok: false, error: 'Гайд недоступен' });
    }
  });
}
