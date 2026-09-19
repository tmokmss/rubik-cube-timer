import type { Solve, SplitStageName, StageName } from './types';

/** 直近 n 回から最速と最遅を1つずつ除いた平均。n 回に満たなければ null。 */
export function aoN(totals: number[], n: number): number | null {
  if (totals.length < n || n < 3) return null;
  const a = totals
    .slice(-n)
    .sort((x, y) => x - y)
    .slice(1, -1);
  return a.reduce((p, c) => p + c, 0) / a.length;
}

export function best(totals: number[]): number | null {
  return totals.length ? Math.min(...totals) : null;
}

/**
 * 1件の記録から区間タイムを取り出す。
 * `LL` は記録がなければ `OLL + PLL` で代用する。
 */
export function stageMs(rec: Solve, name: StageName): number | null {
  const m = new Map<string, number>();
  for (const s of rec.splits ?? []) m.set(s.name, s.ms);
  const direct = m.get(name);
  if (direct != null) return direct;
  if (name === 'LL') {
    const oll = m.get('OLL');
    const pll = m.get('PLL');
    if (oll != null && pll != null) return oll + pll;
  }
  return null;
}

export interface StageAverage {
  name: SplitStageName;
  /** 区間の記録が1件も無ければ null。 */
  avg: number | null;
  target: number;
}

/** 区間つきの記録だけを新しい順に take 件とって、区間ごとに平均する。 */
export function stageAverages(
  solves: Solve[],
  names: readonly SplitStageName[],
  targets: Record<SplitStageName, number>,
  take = 12,
): { rows: StageAverage[]; sampled: number } {
  const recent = solves.filter((s) => s.splits && s.splits.length).slice(-take);
  const rows = names.map((name) => {
    const v = recent
      .map((r) => stageMs(r, name))
      .filter((x): x is number => x != null);
    return {
      name,
      avg: v.length ? v.reduce((p, c) => p + c, 0) / v.length : null,
      target: targets[name],
    };
  });
  return { rows, sampled: recent.length };
}

export interface StageTrendPoint {
  at: string;
  /** names と同じ並びの移動平均(ms)。 */
  values: number[];
  /** values の合計。積み上げたときの上端。 */
  total: number;
}

export interface StageTrend {
  points: StageTrendPoint[];
  /** 何回分の移動平均か。 */
  window: number;
  /** 移動平均の元になった記録の数。 */
  sampled: number;
}

/**
 * 区間ごとの推移。指定した区間が全部そろっている記録だけを対象にする
 * (積み上げたときに合計が欠けないようにするため)。
 *
 * 生の値は跳ねるので移動平均にする。見たいのは「F2L が縮んでいるか」であって
 * 1回ごとの上下ではない。
 */
export function stageTrend(
  solves: Solve[],
  names: readonly SplitStageName[],
  opts: { window?: number; take?: number } = {},
): StageTrend {
  const window = opts.window ?? 5;
  const take = opts.take ?? 60;
  const usable = solves
    .filter((s) => names.every((n) => stageMs(s, n) != null))
    .slice(-take);

  const points = usable.map((s, i) => {
    const slice = usable.slice(Math.max(0, i - window + 1), i + 1);
    const values = names.map(
      (n) => slice.reduce((p, x) => p + stageMs(x, n)!, 0) / slice.length,
    );
    return { at: s.at, values, total: values.reduce((p, c) => p + c, 0) };
  });

  return { points, window, sampled: usable.length };
}
