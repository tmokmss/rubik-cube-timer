import { describe, expect, it } from 'vitest';
import { aoN, best, stageAverages, stageMs } from './stats';
import { targetsFor, type Solve } from './types';

function solve(total: number, splits: Solve['splits'] = []): Solve {
  return { id: `x${total}`, at: '2026-09-19T00:00:00.000Z', total, splits, scramble: '' };
}

describe('aoN', () => {
  it('最速と最遅を1つずつ除いた平均', () => {
    // 10,20,30,40,50 -> 20,30,40 の平均 = 30
    expect(aoN([10, 20, 30, 40, 50], 5)).toBe(30);
  });

  it('直近n回だけを見る', () => {
    expect(aoN([999, 10, 20, 30, 40, 50], 5)).toBe(30);
  });

  it('回数が足りなければ null', () => {
    expect(aoN([10, 20, 30, 40], 5)).toBeNull();
    expect(aoN([], 5)).toBeNull();
  });

  it('元の配列を壊さない', () => {
    const a = [50, 10, 30, 20, 40];
    aoN(a, 5);
    expect(a).toEqual([50, 10, 30, 20, 40]);
  });
});

describe('best', () => {
  it('最小値', () => {
    expect(best([30, 10, 20])).toBe(10);
    expect(best([])).toBeNull();
  });
});

describe('stageMs', () => {
  const four = solve(30_000, [
    { name: 'Cross', ms: 4000 },
    { name: 'F2L', ms: 16_000 },
    { name: 'OLL', ms: 5000 },
    { name: 'PLL', ms: 5000 },
  ]);

  it('記録された区間をそのまま返す', () => {
    expect(stageMs(four, 'F2L')).toBe(16_000);
  });

  it('LL が無ければ OLL + PLL で代用する', () => {
    expect(stageMs(four, 'LL')).toBe(10_000);
  });

  it('LL の記録があればそちらを優先する', () => {
    const three = solve(30_000, [
      { name: 'Cross', ms: 4000 },
      { name: 'F2L', ms: 16_000 },
      { name: 'LL', ms: 10_000 },
    ]);
    expect(stageMs(three, 'LL')).toBe(10_000);
    expect(stageMs(three, 'OLL')).toBeNull();
  });

  it('区間が無い記録は null', () => {
    expect(stageMs(solve(58_000), 'Cross')).toBeNull();
  });
});

describe('stageAverages', () => {
  const targets = targetsFor(30_000);

  it('区間つきの記録だけを直近 take 件ぶん平均する', () => {
    const solves = [
      solve(99_000),
      solve(20_000, [
        { name: 'Cross', ms: 2000 },
        { name: 'F2L', ms: 18_000 },
      ]),
      solve(30_000, [
        { name: 'Cross', ms: 6000 },
        { name: 'F2L', ms: 24_000 },
      ]),
    ];
    const { rows, sampled } = stageAverages(solves, ['Cross', 'F2L'], targets);
    expect(sampled).toBe(2);
    expect(rows[0]).toEqual({ name: 'Cross', avg: 4000, target: 4000 });
    expect(rows[1].avg).toBe(21_000);
  });

  it('区間つきが無ければ avg は null', () => {
    const { rows, sampled } = stageAverages([solve(58_000)], ['Cross'], targets);
    expect(sampled).toBe(0);
    expect(rows[0].avg).toBeNull();
  });
});
