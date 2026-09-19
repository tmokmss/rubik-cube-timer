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
