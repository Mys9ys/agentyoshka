import cors from '@fastify/cors';
import Fastify from 'fastify';
import { loadCalendar, weekdayFromDate } from './lib/calendar.js';
import { demoRoutes } from './routes/demo.js';

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get('/health', async () => ({ ok: true, name: 'agentyoshka-api' }));

app.get('/calendar/today', async () => {
  const calendar = loadCalendar();
  const weekday = weekdayFromDate();
  const day = calendar.week[weekday];
  return { weekday, day };
});

app.get('/skins', async () => {
  const calendar = loadCalendar();
  return { baseSkins: calendar.baseSkins };
});

await demoRoutes(app);

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
