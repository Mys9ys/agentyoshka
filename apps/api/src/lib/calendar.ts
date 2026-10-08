import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import type { Weekday } from '@agentyoshka/shared';

const here = dirname(fileURLToPath(import.meta.url));
const calendarPath = join(here, '../../../../packages/content/calendar.yaml');

export type CalendarFile = {
  week: Record<Weekday, Record<string, unknown>>;
  baseSkins: { id: string; label: string }[];
};

let cached: CalendarFile | null = null;

export function loadCalendar(): CalendarFile {
  if (!cached) {
    const raw = readFileSync(calendarPath, 'utf8');
    cached = YAML.parse(raw) as CalendarFile;
  }
  return cached;
}

export function weekdayFromDate(d = new Date()): Weekday {
  const map: Weekday[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return map[d.getDay()]!;
}
