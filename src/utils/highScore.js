import { HIGH_SCORE_STORAGE_KEY } from '../config/constants.js';

// Storage can be missing or throw (private mode, blocked site data); the game must not care.
function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadBestScore() {
  try {
    const value = Number.parseInt(storage()?.getItem(HIGH_SCORE_STORAGE_KEY) ?? '', 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** Stores `score` if it beats the saved best; returns whether it did. */
export function recordScore(score) {
  if (score <= loadBestScore()) return false;
  try {
    storage()?.setItem(HIGH_SCORE_STORAGE_KEY, String(score));
  } catch {
    // Not persisted, but it is still this session's best.
  }
  return true;
}
