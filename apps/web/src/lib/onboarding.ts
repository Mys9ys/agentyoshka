const FIRST_RUN_KEY = 'agentyoshka_first_run_done';
const SAVE_NUDGE_KEY = 'agentyoshka_save_nudge_done';
const MILESTONE_KEY = 'agentyoshka_milestone_claim';

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return true;
  }
}

function write(key: string) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* private mode */
  }
}

export function isFirstRunDone(): boolean {
  return read(FIRST_RUN_KEY);
}

export function markFirstRunDone() {
  write(FIRST_RUN_KEY);
}

export function isSaveNudgeDone(): boolean {
  return read(SAVE_NUDGE_KEY);
}

export function markSaveNudgeDone() {
  write(SAVE_NUDGE_KEY);
}

export function hasMilestoneClaim(): boolean {
  return read(MILESTONE_KEY);
}

export function markMilestoneClaim() {
  write(MILESTONE_KEY);
}

export function shouldShowSaveNudge(isGuest: boolean): boolean {
  return isGuest && hasMilestoneClaim() && !isSaveNudgeDone();
}
