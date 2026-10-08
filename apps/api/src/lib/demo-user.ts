import { prisma } from './prisma.js';

export const DEMO_EMAIL = 'demo@agentyoshka.local';

export async function getOrCreateDemoUser() {
  let user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: { agent: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        agent: {
          create: {
            displayName: 'Агентёшка',
            baseSkinId: 'bear_cream',
          },
        },
      },
      include: { agent: true },
    });
  }

  if (!user.agent) {
    throw new Error('Demo user has no agent');
  }

  return { user, agent: user.agent };
}
