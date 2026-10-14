import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import type { Agent } from '@prisma/client';
import type { AgentReplySource, VoiceProfile, Weekday } from '@agentyoshka/shared';
import { buildVoiceProfile } from './personality.js';
import type { CalendarDayConfig } from './day-config.js';
import { dateKeyFromDate } from './day-config.js';
import { prisma } from './prisma.js';

const here = dirname(fileURLToPath(import.meta.url));
const slotsPath = join(here, '../../../../packages/content/reply-slots.yaml');

type ReplySlotsFile = {
  maxRegenerationsPerDay: number;
  slots: Record<
    string,
    {
      description: string;
      weekdayHints: Record<Weekday, string>;
    }
  >;
};

let slotsCached: ReplySlotsFile | null = null;

export function loadReplySlots(): ReplySlotsFile {
  if (!slotsCached) {
    slotsCached = YAML.parse(readFileSync(slotsPath, 'utf8')) as ReplySlotsFile;
  }
  return slotsCached;
}

export function maxReplyRegenerations(): number {
  return loadReplySlots().maxRegenerationsPerDay ?? 2;
}

function agentIntroText(day: CalendarDayConfig): string {
  const lines =
    day.intro?.filter((x) => x.speaker === 'agent').map((x) => x.text.trim()) ?? [];
  return lines.join(' ') || day.title || 'Привет!';
}

function charBudget(maxTokens: number): number {
  return Math.max(40, Math.min(480, maxTokens * 3));
}

function pickEmoji(voice: VoiceProfile): string {
  if (voice.effective.emoji < 0.12) return '';
  if (voice.effective.emoji < 0.28) return '🐻';
  if (voice.effective.emoji < 0.45) return '🐻✨';
  return '🐻✨🪙';
}

function shorten(text: string, maxLen: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > maxLen * 0.5 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

function slangSprinkle(text: string, level: number): string {
  if (level < 0.15) return text;
  const openers =
    level < 0.35
      ? ['Слушай, ', 'Знаешь, ']
      : ['Окей, ', 'Короче, ', 'Ну так, '];
  const r = Math.floor(level * 100) % openers.length;
  if (/^(слушай|знаешь|окей|короче)/i.test(text)) return text;
  return openers[r]! + text.charAt(0).toLowerCase() + text.slice(1);
}

function warmthWrap(text: string, level: number): string {
  if (level < 0.45) return text;
  const suffix = level > 0.65 ? ' Ты со мной — справимся.' : ' Рядом?';
  if (text.includes('?') || text.endsWith('.')) return text.replace(/\.$/, '') + suffix + '.';
  return text + suffix;
}

function literaryTouch(text: string, track: string, level: number): string {
  if (level < 0.25) return text;
  if (track === 'pushkin' && level > 0.3) {
    return text.replace(/\.$/, '') + ' — как строчка из лёгкой поэмы.';
  }
  if (track === 'dostoevsky' && level > 0.3) {
    return text.replace(/\.$/, '') + ' Вопрос остаётся открытым.';
  }
  return text;
}

export function buildTemplateReply(
  agent: Agent,
  weekday: Weekday,
  day: CalendarDayConfig,
): { text: string; voice: VoiceProfile } {
  const voice = buildVoiceProfile(agent);
  const budget = charBudget(voice.maxTokens);
  let text = agentIntroText(day);

  if (voice.effective.brevity > 0.72) {
    const first = text.split(/(?<=[.!?])\s+/)[0] ?? text;
    text = first;
  }

  if (voice.effective.playfulness > 0.45 && !text.includes('!')) {
    text = text.replace(/\.$/, '!');
  }

  text = slangSprinkle(text, voice.effective.slang);
  text = warmthWrap(text, voice.effective.warmth);
  text = literaryTouch(text, agent.cultureTrack, voice.effective.literary);

  const em = pickEmoji(voice);
  if (em) text = `${text} ${em}`;

  text = shorten(text, budget);
  return { text, voice };
}

function voiceStyleHints(voice: VoiceProfile): string {
  const e = voice.effective;
  const lines: string[] = [
    `Грейд ${voice.grade} (${voice.gradeLabel}). ${voice.gradeRules}`,
    `Оси (0–1): сленг ${e.slang.toFixed(2)}, теплота ${e.warmth.toFixed(2)}, краткость ${e.brevity.toFixed(2)}, эмодзи ${e.emoji.toFixed(2)}, книжность ${e.literary.toFixed(2)}, игривость ${e.playfulness.toFixed(2)}.`,
    `Лимит: ~${voice.maxTokens} токенов, одна реплика, русский язык, без markdown.`,
    'Не выходи за сценарий дня. Не обещай то, чего нет в игре.',
  ];
  return lines.join('\n');
}

export async function generateLlmReply(
  agent: Agent,
  weekday: Weekday,
  day: CalendarDayConfig,
  slotId: string,
): Promise<string | null> {
  const apiKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = (process.env.LLM_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(
    /\/$/,
    '',
  );
  const model = process.env.LLM_MODEL?.trim() || 'gpt-4o-mini';
  const voice = buildVoiceProfile(agent);
  const slots = loadReplySlots();
  const slot = slots.slots[slotId];
  const hint = slot?.weekdayHints[weekday] ?? '';
  const beat = agentIntroText(day);

  const system = `Ты ${agent.displayName}, мультяшный ИИ-мишка в игре «Агентёшка».
${voiceStyleHints(voice)}`;

  const user = `Слот: ${slotId}. ${slot?.description ?? ''}
День недели: ${weekday}. ${hint}
Ивент: «${day.title ?? 'Сегодня'}».
Опорный текст сценария (перефразируй, не копируй дословно): «${beat}».
Культура игрока: ${agent.cultureTrack}.
Верни только текст реплики.`;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.85,
        max_tokens: Math.min(voice.maxTokens + 16, 200),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    return shorten(raw.replace(/^["«]|["»]$/g, ''), charBudget(voice.maxTokens));
  } catch {
    return null;
  }
}

export async function invalidateDayIntroReply(agentId: string, d = new Date()) {
  const dateKey = dateKeyFromDate(d);
  await prisma.agentReply.deleteMany({
    where: { agentId, dateKey, slotId: 'day_intro' },
  });
}

export async function produceAgentReply(
  agent: Agent,
  weekday: Weekday,
  day: CalendarDayConfig,
  slotId: string,
): Promise<{ text: string; source: AgentReplySource; voice: VoiceProfile }> {
  const llm = await generateLlmReply(agent, weekday, day, slotId);
  if (llm) {
    return { text: llm, source: 'llm', voice: buildVoiceProfile(agent) };
  }
  const templ = buildTemplateReply(agent, weekday, day);
  return { text: templ.text, source: 'template', voice: templ.voice };
}
