import { describe, expect, it } from 'vitest';
import {
  axisAngle,
  axisRot,
  invert,
  isSolvedPiece,
  normalize,
  parse,
  run,
  solved,
  turn,
  type Cube,
} from './cube';

const isSolved = (c: Cube) => normalize(c).every(isSolvedPiece);

describe('キューブのシミュレータ', () => {
  it('同じ面を 4 回まわすと戻る', () => {
    for (const f of ['R', 'U', 'F', 'L', 'D', 'B', 'r', 'M']) {
      expect(isSolved(run(solved(), parse(`${f} ${f} ${f} ${f}`)))).toBe(true);
    }
  });

  it('R U R\' U\' は 6 回で戻り、3 回では戻らない', () => {
    expect(isSolved(run(solved(), parse("R U R' U' ".repeat(6))))).toBe(true);
    expect(isSolved(run(solved(), parse("R U R' U' ".repeat(3))))).toBe(false);
  });

  it('r は R と M\' を同時に回したもの', () => {
    expect(isSolved(run(solved(), parse("r M R'")))).toBe(true);
  });

  it('持ち替え(y)だけなら揃ったままとみなす', () => {
    expect(isSolved(run(solved(), parse('y')))).toBe(true);
  });

  it('手順に逆を続けると戻る', () => {
    const moves = parse("R U2 F' L D' B2 r U'");
    expect(isSolved(run(run(solved(), moves), invert(moves)))).toBe(true);
  });

  it('R で手前右の辺が上に上がる(時計回りの向き)', () => {
    const c = turn(solved(), parse('R')[0]);
    const edge = c.find((p) => p.home.join() === '1,0,1')!;
    expect(edge.pos).toEqual([1, 1, 0]);
  });

  it('途中の角度で回す行列は、90° 単位の回転と向きが揃っている', () => {
    for (const axis of [0, 1, 2] as const) {
      for (const q of [-1, 1, 2]) {
        const m = axisAngle(axis, (q * Math.PI) / 2).map((row) => row.map((v) => Math.round(v) + 0));
        expect(m).toEqual(axisRot(axis, q));
      }
    }
  });
});
