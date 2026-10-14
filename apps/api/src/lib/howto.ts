import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const howtoPath = join(here, '../../../../packages/content/how-to-play.yaml');

export type HowtoItem = {
  title: string;
  body: string;
};

export type HowtoTab = {
  id: string;
  label: string;
  intro?: string;
  items: HowtoItem[];
};

export type HowtoFile = {
  version: number;
  title: string;
  subtitle?: string;
  tabs: HowtoTab[];
  updatedNote?: string;
};

let cached: HowtoFile | null = null;

export function loadHowto(): HowtoFile {
  if (!cached) {
    cached = YAML.parse(readFileSync(howtoPath, 'utf8')) as HowtoFile;
  }
  return cached;
}

export function clearHowtoCache() {
  cached = null;
}
