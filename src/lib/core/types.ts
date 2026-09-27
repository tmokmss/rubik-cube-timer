/**
 * 区間の数。UI のセグメントコントロールと localStorage の `mode` に対応する。
 * `f2l` は F2L だけを測る練習用(Cross は測らずに組んでからスタートする)。
 */
export type Mode = '4' | '3' | '1' | 'f2l';

export const STAGE_SETS = {
  '4': ['Cross', 'F2L', 'OLL', 'PLL'],
  '3': ['Cross', 'F2L', 'LL'],
  '1': ['全体'],
  f2l: ['F2L'],
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
  /** 過去の記録にだけ残っている。今は生成していない。 */
  scramble?: string;
}

/**
 * 消した記録の墓標。
 *
 * 端末間で同期するとき、片方で消した記録がもう片方から復活しないようにするために要る。
 * 和集合でマージするだけだと「消す」が伝わらない。
 */
export interface Tombstone {
  id: string;
  /** 日時+合計の署名。id が振り直された同一記録(CSV 経由など)も消えたままにする。 */
  sig: string;
  /** 消した時刻(ISO8601)。古くなったものを刈るのに使う。 */
  at: string;
}

/** 記録の同一性。CSV は id を持たないので、日時と合計で見分ける。 */
export function solveSignature(s: Pick<Solve, 'at' | 'total'>): string {
  return `${new Date(s.at).getTime()}|${s.total}`;
}

export interface StoreData {
  mode: Mode;
  /** 目標の合計タイム(ms)。v1 の途中から足したので、無ければ 30秒とみなす。 */
  goalMs: GoalMs;
  /** 時系列順(古い順)。 */
  solves: Solve[];
  /** 消した記録。v1 の途中から足したので、無ければ空とみなす。 */
  deleted: Tombstone[];
}

/**
 * スキーマを壊す変更をするときだけ v2 にして storage.ts に移行処理を書く。
 * 既定値を持つ項目の追加は後方互換なのでキーは据え置く。
 */
export const STORAGE_KEY = 'cube-split-timer:v1';

export function isMode(v: unknown): v is Mode {
  return v === '4' || v === '3' || v === '1' || v === 'f2l';
}

export function isGoalMs(v: unknown): v is GoalMs {
  return GOALS_MS.includes(v as GoalMs);
}

export function stagesOf(mode: Mode): readonly StageName[] {
  return STAGE_SETS[mode];
}

/** 区間を記録に残すか。合計のみ(`全体` だけ)のときは splits を空にする。 */
export function recordsSplits(stages: readonly StageName[]): boolean {
  return !(stages.length === 1 && stages[0] === '全体');
}

/**
 * F2L だけを測った練習の記録か。スキーマに種別は持たせず、区間の形で見分ける。
 * 通しのソルブとはタイムの桁が違うので、集計では混ぜない。
 */
export function isF2LOnly(s: Pick<Solve, 'splits'>): boolean {
  return s.splits.length === 1 && s.splits[0].name === 'F2L';
}

/** そのモードで集計・表示する記録。F2L 練習と通しのソルブは分けて見る。 */
export function solvesFor(solves: Solve[], mode: Mode): Solve[] {
  const f2l = mode === 'f2l';
  return solves.filter((s) => isF2LOnly(s) === f2l);
}

/**
 * 集計に使う区間の並び。合計のみモードでも、過去の区間つき記録は4区間で見せる。
 * 積み上げグラフはこの順に下から積む。
 */
export function splitStagesFor(mode: Mode): readonly SplitStageName[] {
  if (mode === 'f2l') return ['F2L'] as const;
  return mode === '3'
    ? (['Cross', 'F2L', 'LL'] as const)
    : (['Cross', 'F2L', 'OLL', 'PLL'] as const);
}
