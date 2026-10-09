import { describe, expect, it } from 'vitest';
import {
  invert,
  isF2LCase,
  isSolvedPiece,
  normalize,
  parse,
  run,
  signature,
  solved,
  type Cube,
} from './cube';
import { F2L_CASES, F2L_GROUPS } from './f2l';

const isSolved = (c: Cube) => normalize(c).every(isSolvedPiece);

// SpeedCubeDB にある各ケースの作り方(揃った状態からこれを回すとそのケースになる)
const SETUPS: Record<number, string> = {
  1: "F R' F' R",
  2: "R' F R F'",
  3: "F' U F",
  4: "R U' R'",
  5: "R U R' U2' R U' R' U",
  6: "F' U' F U2' F' U F U'",
  7: "R U R' U2' R U2' R' U",
  8: "r' U' R2 U' R2' U2' r",
  9: "F' U F U' R U R' U",
  10: "R U' R' U' R U' R' U",
  11: "F' U F U' R U2' R' U",
  12: "R U R' U2' R U R' U' R U R'",
  13: "r U2' R' U R U' R' U M",
  14: "R U' R' U' R U R' U",
  15: "R U R' U' R U R' U2' R U' R'",
  16: "F' U F U2' R U R'",
  17: "R U' R' U R U2' R'",
  18: "R U R' U' R U R' F R' F' R",
  19: "R U R' U' R U2' R' U'",
  20: "R U R' F R' F' R2' U R' U",
  21: "R U' R' U2' R U R'",
  22: "F' L' U2' L F",
  23: "R U' R' U R U' R' U2' R U' R'",
  24: "R U R' F R U R' U' F'",
  25: "F' R U R' U' R' F R",
  26: "F' U' F U R U R' U'",
  27: "R U R' U' R U R'",
  28: "R' F R F' U R U' R'",
  29: "F R' F' R F R' F' R",
  30: "R U' R' U R U' R'",
  31: "R U R' F R' F' R U",
  32: "R U' R' U R U' R' U R U' R'",
  33: "R U R' U2' R U R' U",
  34: "R U' R' U2' R U' R' U'",
  35: "F' U F U' R U' R' U",
  36: "R U' R' U2' F R' F' R U2'",
  37: "R U' R U2' F R2' F' U2' R2'",
  38: "R U' R' U R U2' R' U R U' R'",
  39: "R U' R' U' R U R' U2' R U' R'",
  40: "R U R' F U R U' R' F' R U R'",
  41: "R F U R U' R' F' U' R'",
};

describe('F2L の手順', () => {
  it.each(F2L_CASES)('F2L $id: $alg', ({ id, alg }) => {
    const moves = parse(alg);
    const start = normalize(run(solved(), invert(moves)));
    // 手順の逆を当てると、他のスロットを崩さない F2L の形になる
    expect(isF2LCase(start)).toBe(true);
    expect(isSolved(run(start, moves))).toBe(true);
    // それが SpeedCubeDB の同じ番号のケース(U の回し方の違いは除く)
    expect(signature(start)).toBe(signature(normalize(run(solved(), parse(SETUPS[id])))));
  });

  it('41 ケースが重複せず、ペアの置き方をすべて覆う', () => {
    const covered = new Set(
      F2L_CASES.map(({ alg }) => signature(normalize(run(solved(), invert(parse(alg)))))),
    );
    expect(covered.size).toBe(41);

    // F2L を保つ動きでペアの置き方を全部たどる
    const gens = ["R U R'", "R U' R'", "F' U F", "F' U' F", 'U', "R U2 R'", "F' U2 F"].map(parse);
    const key = (c: Cube) =>
      c
        .filter((p) => p.home[1] !== 1)
        .map((p) => JSON.stringify([p.pos, p.rot]))
        .join();
    const seen = new Set<string>();
    const reach = new Set<string>();
    const queue: Cube[] = [solved()];
    while (queue.length) {
      const c = queue.pop()!;
      if (seen.has(key(c))) continue;
      seen.add(key(c));
      reach.add(signature(c));
      for (const g of gens) {
        const n = run(c, g);
        if (isF2LCase(n)) queue.push(n);
      }
    }
    reach.delete(signature(solved()));
    expect(reach).toEqual(covered);
  });

  it('どのケースもいずれかのグループに入る', () => {
    const keys = new Set(F2L_GROUPS.map((g) => g.key));
    expect(F2L_CASES.every((c) => keys.has(c.group))).toBe(true);
  });
});
