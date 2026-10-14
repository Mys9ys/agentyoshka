import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const feedPath = join(here, '../../../../packages/content/feed-bots.yaml');

export type FeedRelease = {
  id: string;
  title: string;
  blurb: string;
  minigameId: string;
  coinsTip: number;
};

export type FeedBot = {
  id: string;
  displayName: string;
  grade: string;
  tagline: string;
  skinTone: string;
  releases: FeedRelease[];
};

type FeedFile = {
  maxVisitsPerDay: number;
  visitReward: { baseCoins: number; bonusIfWin: number };
  bots: FeedBot[];
};

let cached: FeedFile | null = null;

export function loadFeed(): FeedFile {
  if (!cached) {
    cached = YAML.parse(readFileSync(feedPath, 'utf8')) as FeedFile;
  }
  return cached;
}

export function findRelease(releaseId: string): {
  bot: FeedBot;
  release: FeedRelease;
} | null {
  const feed = loadFeed();
  for (const bot of feed.bots) {
    const release = bot.releases.find((r) => r.id === releaseId);
    if (release) return { bot, release };
  }
  return null;
}

export function clearFeedCache() {
  cached = null;
}
