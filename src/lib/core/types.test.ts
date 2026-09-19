import { describe, expect, it } from 'vitest';
import { GOALS_MS, isGoalMs, isMode, stagesOf, targetsFor } from './types';

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
  });
});
