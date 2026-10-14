import cors from '@fastify/cors';
import Fastify from 'fastify';
import { loadCalendar, weekdayFromDate } from './lib/calendar.js';
import { agentReplyRoutes } from './routes/agent-reply.js';
import { authRoutes } from './routes/auth.js';
import { dailyLoginRoutes } from './routes/daily-login.js';
import { feedRoutes } from './routes/feed.js';
import { howtoRoutes } from './routes/howto.js';
import { machineRoutes } from './routes/machine.js';
import { minigamesRoutes } from './routes/minigames.js';
import { monetizationRoutes } from './routes/monetization.js';
import { demoRoutes } from './routes/demo.js';
import { productionRoutes } from './routes/production.js';
import { profileRoutes } from './routes/profile.js';
import { shopRoutes } from './routes/shop.js';

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

await authRoutes(app);
await demoRoutes(app);
await agentReplyRoutes(app);
await shopRoutes(app);
await profileRoutes(app);
await productionRoutes(app);
await dailyLoginRoutes(app);
await machineRoutes(app);
await minigamesRoutes(app);
await feedRoutes(app);
await monetizationRoutes(app);
await howtoRoutes(app);

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
