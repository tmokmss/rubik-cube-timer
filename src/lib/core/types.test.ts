import { describe, expect, it } from 'vitest';
import {
  GOALS_MS,
  isF2LOnly,
  isGoalMs,
  isMode,
  recordsSplits,
  solvesFor,
  splitStagesFor,
  stagesOf,
  targetsFor,
  type Solve,
} from './types';

describe('targetsFor', () => {
  it('30秒はそのまま', () => {
    expect(targetsFor(30_000)).toEqual({
      Cross: 4000,
      F2L: 16_000,
      OLL: 5000,
      PLL: 5000,
      LL: 10_000,
    });
  });

  it('目標を変えると比例配分される', () => {
    expect(targetsFor(60_000)).toEqual({
      Cross: 8000,
      F2L: 32_000,
      OLL: 10_000,
      PLL: 10_000,
      LL: 20_000,
    });
    expect(targetsFor(45_000).F2L).toBe(24_000);
  });

  it('Cross + F2L + OLL + PLL は目標と一致する', () => {
    for (const g of GOALS_MS) {
      const t = targetsFor(g);
      expect(t.Cross + t.F2L + t.OLL + t.PLL).toBe(g);
      expect(t.OLL + t.PLL).toBe(t.LL);
    }
  });
});

describe('guards', () => {
  it('mode', () => {
    expect(isMode('4')).toBe(true);
    expect(isMode('f2l')).toBe(true);
    expect(isMode('2')).toBe(false);
  });

  it('goal', () => {
    expect(isGoalMs(30_000)).toBe(true);
    expect(isGoalMs(25_000)).toBe(false);
    expect(isGoalMs(undefined)).toBe(false);
  });

  it('stages', () => {
    expect(stagesOf('4')).toEqual(['Cross', 'F2L', 'OLL', 'PLL']);
    expect(stagesOf('1')).toEqual(['全体']);
    expect(stagesOf('f2l')).toEqual(['F2L']);
  });

  it('合計のみのときだけ区間を残さない', () => {
    expect(recordsSplits(stagesOf('1'))).toBe(false);
    expect(recordsSplits(stagesOf('f2l'))).toBe(true);
    expect(recordsSplits(stagesOf('4'))).toBe(true);
  });

  it('集計用の区間は3区間のときだけ LL になる', () => {
    expect(splitStagesFor('3')).toEqual(['Cross', 'F2L', 'LL']);
    expect(splitStagesFor('4')).toEqual(['Cross', 'F2L', 'OLL', 'PLL']);
    // 合計のみモードでも、過去の区間つき記録は4区間で見せる
    expect(splitStagesFor('1')).toEqual(['Cross', 'F2L', 'OLL', 'PLL']);
    expect(splitStagesFor('f2l')).toEqual(['F2L']);
  });
});

describe('F2L 練習の記録', () => {
  const mk = (id: string, splits: Solve['splits']): Solve => ({
    id,
    at: '2026-09-27T00:00:00.000Z',
    total: splits.reduce((p, c) => p + c.ms, 0) || 40_000,
    splits,
  });
  const full = mk('full', [
    { name: 'Cross', ms: 4000 },
    { name: 'F2L', ms: 16_000 },
    { name: 'LL', ms: 10_000 },
  ]);
  const total = mk('total', []);
  const f2l = mk('f2l', [{ name: 'F2L', ms: 15_000 }]);

  it('F2L だけの区間を持つ記録を見分ける', () => {
    expect(isF2LOnly(f2l)).toBe(true);
    expect(isF2LOnly(full)).toBe(false);
    expect(isF2LOnly(total)).toBe(false);
  });

  it('F2L モードでは F2L 練習だけ、他では F2L 練習を除く', () => {
    const all = [full, f2l, total];
    expect(solvesFor(all, 'f2l').map((s) => s.id)).toEqual(['f2l']);
    for (const m of ['4', '3', '1'] as const) {
      expect(solvesFor(all, m).map((s) => s.id)).toEqual(['full', 'total']);
    }
  });
});
