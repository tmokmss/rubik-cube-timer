import {
  DEFAULT_GOAL_MS,
  STORAGE_KEY,
  isGoalMs,
  isMode,
  type StoreData,
} from './types';

/** 記録は各自の localStorage にしか無い。初期値は空。 */
export function emptyStore(): StoreData {
  return { mode: '4', goalMs: DEFAULT_GOAL_MS, solves: [] };
}

function sanitize(raw: unknown): StoreData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<StoreData>;
  if (!Array.isArray(d.solves)) return null;
  return {
    solves: d.solves,
    mode: isMode(d.mode) ? d.mode : '4',
    goalMs: isGoalMs(d.goalMs) ? d.goalMs : DEFAULT_GOAL_MS,
  };
}

export interface LoadResult {
  data: StoreData;
  /** localStorage が読めない環境(プライベートモード等)では false。 */
  canSave: boolean;
}

export function loadStore(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: emptyStore(), canSave: true };
    return { data: sanitize(JSON.parse(raw)) ?? emptyStore(), canSave: true };
  } catch {
    return { data: emptyStore(), canSave: false };
  }
}

export function saveStore(data: StoreData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
