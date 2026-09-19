import {
  DEFAULT_GOAL_MS,
  STORAGE_KEY,
  isGoalMs,
  isMode,
  type Solve,
  type StoreData,
} from './types';

export function emptyStore(): StoreData {
  return { mode: '4', goalMs: DEFAULT_GOAL_MS, seeded: false, solves: [] };
}

/**
 * 過去にスプレッドシートで記録していた分。合計のみで splits は空。
 * 一度きり(`seeded`)。GitHub Pages に移すとオリジンが変わるのでここでも改めて入る。
 */
export function seedSolves(): Solve[] {
  const past: Array<[month: number, day: number, seconds: number]> = [
    [6, 11, 260],
    [6, 12, 133],
    [6, 15, 97],
    [6, 21, 94],
    [6, 22, 58],
    [6, 22, 120],
    [6, 22, 72],
    [6, 22, 72],
    [7, 5, 85],
  ];
  return past
    .map(([m, d, sec], i) => ({
      id: `seed${i}`,
      at: new Date(2026, m - 1, d, 12, i).toISOString(),
      total: sec * 1000,
      splits: [],
      scramble: '',
    }))
    .sort((a, b) => (a.at < b.at ? -1 : 1));
}

function sanitize(raw: unknown): StoreData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<StoreData>;
  if (!Array.isArray(d.solves)) return null;
  return {
    solves: d.solves,
    mode: isMode(d.mode) ? d.mode : '4',
    goalMs: isGoalMs(d.goalMs) ? d.goalMs : DEFAULT_GOAL_MS,
    seeded: !!d.seeded,
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
