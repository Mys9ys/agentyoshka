import type { Agent } from '@prisma/client';
import type { AgentProfile } from '@agentyoshka/shared';

export function toAgentProfile(a: Agent): AgentProfile {
  return {
    id: a.id,
    displayName: a.displayName,
    baseSkinId: a.baseSkinId,
    level: a.level,
    cultureXp: a.cultureXp,
    trainingGrade: a.trainingGrade as AgentProfile['trainingGrade'],
    cultureTrack: a.cultureTrack as AgentProfile['cultureTrack'],
  };
}
