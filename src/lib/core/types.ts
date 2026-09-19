/** 区間の数。UI のセグメントコントロールと localStorage の `mode` に対応する。 */
export type Mode = '4' | '3' | '1';

export const STAGE_SETS = {
  '4': ['Cross', 'F2L', 'OLL', 'PLL'],
  '3': ['Cross', 'F2L', 'LL'],
  '1': ['全体'],
} as const satisfies Record<Mode, readonly string[]>;

export type StageName = (typeof STAGE_SETS)[Mode][number];

/** 区間つきモードで集計に使う区間名(合計のみモードは集計対象外)。 */
export const SPLIT_STAGES = ['Cross', 'F2L', 'OLL', 'PLL', 'LL'] as const;
export type SplitStageName = (typeof SPLIT_STAGES)[number];

/** 目標の合計タイム。UI で切り替える。 */
export const GOALS_MS = [60_000, 45_000, 30_000] as const;
export type GoalMs = (typeof GOALS_MS)[number];
export const DEFAULT_GOAL_MS: GoalMs = 30_000;

/**
 * 合計30秒を切るときの区間ごとの目安。Cross+F2L+OLL+PLL = 30秒 ちょうど。
 * 他の目標値はこれを比例配分する。
 */
const BASE_TARGET_MS: Record<SplitStageName, number> = {
  Cross: 4_000,
  F2L: 16_000,
  OLL: 5_000,
  PLL: 5_000,
  LL: 10_000,
};

/** 目標の合計タイムから区間ごとの目安を出す。合計は必ず目標と一致する。 */
export function targetsFor(goalMs: number): Record<SplitStageName, number> {
  const k = goalMs / 30_000;
  return {
    Cross: BASE_TARGET_MS.Cross * k,
    F2L: BASE_TARGET_MS.F2L * k,
    OLL: BASE_TARGET_MS.OLL * k,
    PLL: BASE_TARGET_MS.PLL * k,
    LL: BASE_TARGET_MS.LL * k,
  };
}

export interface Split {
  name: StageName;
  /** ミリ秒の整数。 */
  ms: number;
}

export interface Solve {
  id: string;
  /** ISO8601。 */
  at: string;
  /** ミリ秒の整数。 */
  total: number;
  /** 空配列なら合計のみの記録。 */
  splits: Split[];
  scramble: string;
}

export interface StoreData {
  mode: Mode;
  /** 目標の合計タイム(ms)。v1 の途中から足したので、無ければ 30秒とみなす。 */
  goalMs: GoalMs;
  /** 時系列順(古い順)。 */
  solves: Solve[];
}

/**
 * スキーマを壊す変更をするときだけ v2 にして storage.ts に移行処理を書く。
 * 既定値を持つ項目の追加は後方互換なのでキーは据え置く。
 */
export const STORAGE_KEY = 'cube-split-timer:v1';

export function isMode(v: unknown): v is Mode {
  return v === '4' || v === '3' || v === '1';
}

export function isGoalMs(v: unknown): v is GoalMs {
  return GOALS_MS.includes(v as GoalMs);
}

export function stagesOf(mode: Mode): readonly StageName[] {
  return STAGE_SETS[mode];
}
