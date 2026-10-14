import type { CultureTrack, Weekday } from '@agentyoshka/shared';
import { loadCalendar } from './calendar.js';

export type DayReward = {
  cultureXp?: number;
  coins?: number;
};

export type LessonChoiceOption = {
  track: CultureTrack;
  label: string;
};

export type CalendarDayConfig = {
  id?: string;
  title?: string;
  intro?: { speaker: string; text: string }[];
  lessonChoice?: { a: LessonChoiceOption; b: LessonChoiceOption };
  minigame?: string;
  socialHint?: string;
  reward?: DayReward;
};

export function applyReward(
  base: { cultureXp: number; coins: number },
  reward: DayReward | undefined,
) {
  return {
    cultureXp: base.cultureXp + (reward?.cultureXp ?? 0),
    coins: base.coins + (reward?.coins ?? 0),
  };
}

export function dateKeyFromDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDayConfig(weekday: Weekday): CalendarDayConfig {
  const calendar = loadCalendar();
  return calendar.week[weekday] as CalendarDayConfig;
}

export function trainingGradeForXp(cultureXp: number): string {
  if (cultureXp >= 200) return 'G4';
  if (cultureXp >= 120) return 'G3';
  if (cultureXp >= 60) return 'G2';
  if (cultureXp >= 25) return 'G1';
  return 'G0';
}
