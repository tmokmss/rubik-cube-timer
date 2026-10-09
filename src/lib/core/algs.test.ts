import { describe, expect, it } from 'vitest';
import {
  f2lSignature,
  invert,
  isF2LCase,
  isOLLCase,
  isPair,
  isPLLCase,
  isSolvedPiece,
  normalize,
  ollSignature,
  parse,
  pllSignature,
  run,
  solved,
  type Cube,
} from './cube';
import { ALG_SETS, type AlgSetName } from './algs';

const isSolved = (c: Cube) => normalize(c).every(isSolvedPiece);
// 手順の逆を揃った状態に当てたもの。手順が持ち替えで始まるときは、持ち替える前の持ち方のまま
const startOf = (alg: string) => run(solved(), invert(parse(alg)));
const caseOf = (alg: string) => normalize(startOf(alg));

const CHECKS: Record<AlgSetName, { isCase: (c: Cube) => boolean; sig: (c: Cube) => string }> = {
  F2L: { isCase: isF2LCase, sig: f2lSignature },
  OLL: { isCase: isOLLCase, sig: ollSignature },
  PLL: { isCase: isPLLCase, sig: pllSignature },
};

// SpeedCubeDB にある各ケースの作り方(揃った状態からこれを回すとそのケースになる)
const SETUPS: Record<AlgSetName, Record<string, string>> = {
  F2L: {
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
  },
  OLL: {
    1: "F R' F' R U2' F R' F' R2' U2' R'",
    2: "f U R U' R' f' F U R U' R' F'",
    3: "F U R U' R' F' U f U R U' R' f' y",
    4: "F U R U' R' F' U' f U R U' R' f' y",
    5: "r' U' R U' R' U2' r",
    6: "r U R' U R U2' r'",
    7: "r U2' R' U' R U' r'",
    8: "r' U2' R U R' U r y2'",
    9: "F U R U' R2' F' R U R U' R' y'",
    10: "R U2' R' F R' F' R U' R U' R'",
    11: "M U' R U2' R' U' R U' R2' r",
    12: "F U R U' R' F' U' F U R U' R' F'",
    13: "F' U' F r U' r' U r U r'",
    14: "F U F' R' F R U' R' F' R",
    15: "r' U' r U' R' U R r' U r",
    16: "r U r' U R U' R' r U' r'",
    17: "F R' F' R U2' F R' F' R U' R U' R'",
    18: "r' U2' R U R' U r2' U2' R' U' R U' r'",
    19: "F R' F' R M U R U' R' U' M'",
    20: "r U R' U' M2' U R U' R' U' M'",
    21: "R U R' U R U' R' U R U2' R' y'",
    22: "R' U2' R2' U R2' U R2' U2' R'",
    23: "R U2' R D R' U2' R D' R2'",
    24: "F R' F' r U R U' r'",
    25: "R' F' r U R U' r' F y'",
    26: "R U R' U R U2' R' y'",
    27: "R U2' R' U' R U' R'",
    28: "R U R' U' M' U R U' r'",
    29: "M F R' F' R U R U' R' U' M'",
    30: "F U R U2' R' U R U2' R' U' F' y2'",
    31: "R' F R U R' U' F' U R",
    32: "f R' F' R U R U' R' S'",
    33: "F R' F' R U R U' R'",
    34: "F U R' U' R' F' R U R2' U' R' y2'",
    35: "R U2' R' F R' F' R2' U2' R'",
    36: "F' L F L' U' L' U' L U L' U L y2'",
    37: "F R U' R' U R U R' F'",
    38: "F R' F' R U R U R' U' R U' R'",
    39: "L U F' U' L' U L F L' y'",
    40: "R' U' F U R U' R' F' R y'",
    41: "F U R U' R' F' R U2' R' U' R U' R' y2'",
    42: "F U R U' R' F' R' U2' R U R' U R",
    43: "f' U' L' U L f",
    44: "f U R U' R' f'",
    45: "F U R U' R' F'",
    46: "R' U' F R' F' R U R",
    47: "F' U' L' U L U' L' U L F",
    48: "F U R U' R' U R U' R' F'",
    49: "r' U r2' U' r2' U' r2' U r' y2'",
    50: "r U' r2' U r2' U r2' U' r",
    51: "f U R U' R' U R U' R' f'",
    52: "F R U R' d R' U' R U' R'",
    53: "r' U2' R U R' U' R U R' U r",
    54: "r U2' R' U' R U R' U' R U' r'",
    55: "F R' F' U2' R U R' U R2' U2' R'",
    56: "r U r' R U R' U' R U R' U' r U' r'",
    57: "r U R' U' M U R U' R'",
  },
  PLL: {
    'Aa': "x R2' D2' R U R' D2' R U' R x'",
    'Ab': "x R' U R' D2' R U' R' D2' R2' x'",
    'E': "x' D R U R' D' R U' R' D R U' R' D' R U R' x y'",
    'F': "R' U' R U' R' U R U R2' F' R U R U' R' F U R y'",
    'Ga': "R' U' R D' U R2' U R' U R U' R U' R2' D",
    'Gb': "R2' U R' U R' U' R U' R2' D U' R' U R D'",
    'Gc': "D' R U R' U' D R2' U' R U' R' U R' U R2'",
    'Gd': "R2' U' R U' R U R' U R2' D' U R U' R' D",
    'H': "M2' U' M2' U2' M2' U' M2'",
    'Ja': "L' R' U2' R U R' U2' L U' R y'",
    'Jb': "R U R2' F' R U R U' R' F R U' R'",
    'Na': "R U R' U2' R U R2' F' R U R U' R' F R U' R' U' R U' R'",
    'Nb': "F r' F' r U r U' r2' D' F r U r' F' D r",
    'Ra': "R U2' R D R' U R D' R' U' R' U R U R' y'",
    'Rb': "R' U R U R' U' R' D' R U R' D R U2' R",
    'T': "F R U' R' U R U R2' F' R U R U' R'",
    'Ua': "M2' U' M' U2' M U' M2'",
    'Ub': "M2' U M' U2' M U M2'",
    'V': "D2' R' U R D' R2' U' R' U R' U R' D' R U2' R'",
    'Y': "F R' F' R U R U' R' F R U' R' U R U R' F'",
    'Z': "M U2' M2' U2' M U' M2' U' M2'",
  },
};

// 揃った状態から、条件を保つ動きでたどれる状態を key ごとに 1 つずつ集める
const explore = (gens: string[], keep: (c: Cube) => boolean, key: (c: Cube) => string) => {
  const moves = gens.map(parse);
  const seen = new Map<string, Cube>();
  const queue: Cube[] = [solved()];
  while (queue.length) {
    const c = queue.pop()!;
    const k = key(c);
    if (seen.has(k)) continue;
    seen.set(k, c);
    for (const m of moves) {
      const n = run(c, m);
      if (keep(n) && !seen.has(key(n))) queue.push(n);
    }
  }
  return [...seen.values()];
};
// F2L はペア 2 つの位置と向きだけで区別する(他は isF2LCase で揃っている)
const pairKey = (c: Cube) =>
  c
    .filter(isPair)
    .map((p) => JSON.stringify([p.pos, p.rot]))
    .join();

describe.each(Object.keys(ALG_SETS) as AlgSetName[])('%s', (set) => {
  const { isCase, sig } = CHECKS[set];

  it.each(ALG_SETS[set].cases)('$name: $alg', ({ name, alg }) => {
    expect(isCase(caseOf(alg))).toBe(true);
    expect(isSolved(run(startOf(alg), parse(alg)))).toBe(true);
    expect(sig(caseOf(alg))).toBe(sig(normalize(run(solved(), parse(SETUPS[set][name])))));
  });

  it('どのケースもいずれかのグループに入る', () => {
    const keys = new Set(ALG_SETS[set].groups.map((g) => g.key));
    expect(ALG_SETS[set].cases.every((c) => keys.has(c.group))).toBe(true);
  });
});

describe('ケースの網羅', () => {
  const covered = (set: AlgSetName) => new Set(ALG_SETS[set].cases.map((c) => CHECKS[set].sig(caseOf(c.alg))));

  it('F2L: 41 ケースでペアの置き方をすべて覆う', () => {
    const states = explore(["R U R'", "R U' R'", "F' U F", "F' U' F", 'U', "R U2 R'", "F' U2 F"], isF2LCase, pairKey);
    const all = new Set(states.map(f2lSignature));
    all.delete(f2lSignature(solved()));
    expect(covered('F2L').size).toBe(41);
    expect(covered('F2L')).toEqual(all);
  });

  const ll = (c: Cube) => c.filter((p) => p.home[1] === 1);
  // 上の面の向きの模様だけを見てたどる。3^3 · 2^3 = 216 通り
  const orientations = explore(
    ["R U R' U R U2 R'", "F R U R' U' F'", 'U'],
    isOLLCase,
    (c) =>
      ll(c)
        .map((p) => JSON.stringify([p.pos, p.rot.map((row) => row[1])]))
        .sort()
        .join(),
  );
  // 向きが揃ったまま並びだけを見てたどる。4!·4!/2 = 288 通り
  const permutations = explore(
    // T(角 2 つと辺 2 つの入れ替え)、Ua(辺 3 つ)、Aa(角 3 つ)
    ["R U R' U' R' F R2 U' R' U' R U R' F'", "R U' R U R U R U' R' U' R2", "R' F R' B2 R F' R' B2 R2", 'U'],
    isPLLCase,
    (c) =>
      ll(c)
        .map((p) => JSON.stringify([p.pos, p.home]))
        .sort()
        .join(),
  );

  it('上の段の向きと並びを全部たどれている', () => {
    expect(orientations.length).toBe(216);
    expect(permutations.length).toBe(288);
  });

  it('OLL: 57 ケースで上の面の向きをすべて覆う', () => {
    const all = new Set(orientations.map(ollSignature));
    all.delete(ollSignature(solved()));
    expect(covered('OLL').size).toBe(57);
    expect(covered('OLL')).toEqual(all);
  });

  it('PLL: 21 ケースで上の段の並びをすべて覆う', () => {
    const all = new Set(permutations.map(pllSignature));
    all.delete(pllSignature(solved()));
    expect(covered('PLL').size).toBe(21);
    expect(covered('PLL')).toEqual(all);
  });
});
