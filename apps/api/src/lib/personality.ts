import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import type { Agent } from '@prisma/client';
import type { PersonalityAxis, PersonalityVector, VoiceProfile } from '@agentyoshka/shared';
import type { TrainingGrade } from '@agentyoshka/shared';
import { prisma } from './prisma.js';

const here = dirname(fileURLToPath(import.meta.url));
const gradePath = join(here, '../../../../packages/content/grade-policies.yaml');
const driftPath = join(here, '../../../../packages/content/personality-drift.yaml');

export const PERSONALITY_AXES: PersonalityAxis[] = [
  'slang',
  'warmth',
  'brevity',
  'emoji',
  'literary',
  'playfulness',
];

type GradePolicyFile = {
  grades: Record<
    TrainingGrade,
    {
      label: string;
      maxTokens: number;
      rules: string;
      caps: PersonalityVector;
    }
  >;
};

type DriftFile = {
  axes: Record<PersonalityAxis, { label: string; hint: string }>;
  drift: Record<string, Record<string, number> | Record<string, Record<string, number>>>;
};

let gradeCached: GradePolicyFile | null = null;
let driftCached: DriftFile | null = null;

export function loadGradePolicies(): GradePolicyFile {
  if (!gradeCached) {
    gradeCached = YAML.parse(readFileSync(gradePath, 'utf8')) as GradePolicyFile;
  }
  return gradeCached;
}

export function loadDriftConfig(): DriftFile {
  if (!driftCached) {
    driftCached = YAML.parse(readFileSync(driftPath, 'utf8')) as DriftFile;
  }
  return driftCached;
}

const DEFAULT_CENTER: PersonalityVector = {
  slang: 0.12,
  warmth: 0.42,
  brevity: 0.7,
  emoji: 0.1,
  literary: 0.2,
  playfulness: 0.35,
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Number(n.toFixed(4))));
}

function hashSeed(input: string): number {
  const hex = createHash('sha256').update(input).digest('hex').slice(0, 8);
  return parseInt(hex, 16) / 0xffffffff;
}

export function seedPersonality(agentId: string): PersonalityVector {
  const out = { ...DEFAULT_CENTER };
  for (const axis of PERSONALITY_AXES) {
    const r = hashSeed(`${agentId}:${axis}`);
    const jitter = (r - 0.5) * 0.14;
    out[axis] = clamp01(out[axis] + jitter);
  }
  return out;
}

export function parsePersonality(agent: Agent): PersonalityVector {
  const raw = agent.personalityJson;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, number>;
    const out = { ...DEFAULT_CENTER };
    for (const axis of PERSONALITY_AXES) {
      if (typeof obj[axis] === 'number') out[axis] = clamp01(obj[axis]);
    }
    return out;
  }
  return seedPersonality(agent.id);
}

function applyCaps(raw: PersonalityVector, grade: TrainingGrade): PersonalityVector {
  const caps = loadGradePolicies().grades[grade]?.caps ?? loadGradePolicies().grades.G0.caps;
  const out = {} as PersonalityVector;
  for (const axis of PERSONALITY_AXES) {
    out[axis] = clamp01(Math.min(raw[axis], caps[axis] ?? 1));
  }
  return out;
}

export function buildVoiceProfile(agent: Agent): VoiceProfile {
  const grade = (agent.trainingGrade as TrainingGrade) || 'G0';
  const policy = loadGradePolicies().grades[grade] ?? loadGradePolicies().grades.G0;
  const raw = parsePersonality(agent);
  const effective = applyCaps(raw, grade);
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - agent.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
  );

  let uniqueness = 0;
  for (const axis of PERSONALITY_AXES) {
    uniqueness += Math.abs(raw[axis] - DEFAULT_CENTER[axis]);
  }
  uniqueness = clamp01(uniqueness / PERSONALITY_AXES.length / 0.5);

  const axisMeta = loadDriftConfig().axes;

  return {
    grade,
    gradeLabel: policy.label,
    gradeRules: policy.rules,
    maxTokens: policy.maxTokens,
    ageDays,
    raw,
    effective,
    uniqueness,
    axisLabels: axisMeta,
  };
}

export function mergeDrift(
  current: PersonalityVector,
  delta: Partial<PersonalityVector>,
): PersonalityVector {
  const out = { ...current };
  for (const [key, val] of Object.entries(delta)) {
    const axis = key as PersonalityAxis;
    if (PERSONALITY_AXES.includes(axis) && typeof val === 'number') {
      out[axis] = clamp01(out[axis] + val);
    }
  }
  return out;
}

export async function persistPersonality(agentId: string, vector: PersonalityVector) {
  await prisma.agent.update({
    where: { id: agentId },
    data: { personalityJson: vector },
  });
}

export function driftForLesson(
  track: 'pushkin' | 'dostoevsky' | 'neutral',
): Partial<PersonalityVector> {
  const d = loadDriftConfig().drift;
  if (track === 'pushkin') {
    return d.lesson_pushkin as Partial<PersonalityVector>;
  }
  if (track === 'dostoevsky') {
    return d.lesson_dostoevsky as Partial<PersonalityVector>;
  }
  return (d.lesson_neutral ?? {}) as Partial<PersonalityVector>;
}

export function driftForMinigame(): Partial<PersonalityVector> {
  return loadDriftConfig().drift.minigame_done as Partial<PersonalityVector>;
}

export function driftForShopItem(itemId: string): Partial<PersonalityVector> {
  const shop = loadDriftConfig().drift.shop as Record<string, Record<string, number>>;
  return shop[itemId] ?? {};
}

export async function applyDriftToAgent(agent: Agent, delta: Partial<PersonalityVector>) {
  if (Object.keys(delta).length === 0) return agent;
  const next = mergeDrift(parsePersonality(agent), delta);
  return prisma.agent.update({
    where: { id: agent.id },
    data: { personalityJson: next },
  });
}
