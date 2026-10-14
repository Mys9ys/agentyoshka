import { prisma } from './prisma.js';
import { parsePersonality, persistPersonality, seedPersonality } from './personality.js';

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
  }

  if (!user.agent) {
    throw new Error('Demo user has no agent');
  }

  let agent = user.agent;
  if (agent.personalityJson == null) {
    await persistPersonality(agent.id, seedPersonality(agent.id));
    agent = (await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } }))!;
  } else {
    parsePersonality(agent);
  }

  return { user, agent };
}
