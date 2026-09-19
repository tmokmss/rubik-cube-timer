import { describe, expect, it } from 'vitest';
import { makeScramble } from './scramble';

const FACE = /^[UDRLFB]('|2)?$/;

describe('makeScramble', () => {
  it('20手で、すべて正しい記法', () => {
    for (let i = 0; i < 200; i++) {
      const moves = makeScramble().split(' ');
      expect(moves).toHaveLength(20);
      for (const m of moves) expect(m).toMatch(FACE);
    }
  });

  it('同じ面が連続しない', () => {
    for (let i = 0; i < 200; i++) {
      const faces = makeScramble()
        .split(' ')
        .map((m) => m[0]);
      for (let j = 1; j < faces.length; j++) expect(faces[j]).not.toBe(faces[j - 1]);
    }
  });

  it('同じ軸が3手続かない', () => {
    const axis: Record<string, number> = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };
    for (let i = 0; i < 200; i++) {
      const a = makeScramble()
        .split(' ')
        .map((m) => axis[m[0]]);
      for (let j = 2; j < a.length; j++) {
        expect(a[j] === a[j - 1] && a[j] === a[j - 2]).toBe(false);
      }
    }
  });

  it('rng を差し替えられる', () => {
    const seq = [0.1, 0.9, 0.3, 0.2, 0.5, 0.4];
    let i = 0;
    const rng = () => seq[i++ % seq.length];
    expect(makeScramble(rng)).toBe(makeScramble(((i = 0), rng)));
  });
});
