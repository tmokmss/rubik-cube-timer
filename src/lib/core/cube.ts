// 27 個のキューブを位置と向き(3x3 の整数回転行列)で持つモデル。
// 座標は x=右, y=上, z=手前。面の色は家の位置で決まり、向きの行列でワールドへ写す。

export type Vec = [number, number, number];
export type Mat = [Vec, Vec, Vec];
export type Cubie = { home: Vec; pos: Vec; rot: Mat };
export type Cube = Cubie[];

export type Move = {
  token: string;
  axis: 0 | 1 | 2;
  layers: number[];
  // 軸の正の向きから見て時計回りを -1 とする回転の量 (1 = 90°)
  turns: number;
};

const I: Mat = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

export const solved = (): Cube => {
  const cube: Cube = [];
  for (const x of [-1, 0, 1])
    for (const y of [-1, 0, 1])
      for (const z of [-1, 0, 1]) cube.push({ home: [x, y, z], pos: [x, y, z], rot: I });
  return cube;
};

const mul = (a: Mat, b: Mat): Mat =>
  [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j])) as Mat;
const apply = (m: Mat, v: Vec): Vec =>
  [0, 1, 2].map((i) => m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2]) as Vec;
const transpose = (m: Mat): Mat => [0, 1, 2].map((i) => [0, 1, 2].map((j) => m[j][i])) as Mat;

// 軸まわりに 90°×q 回す行列(右手系、q>0 で反時計回り)
export const axisRot = (axis: 0 | 1 | 2, q: number): Mat => {
  const k = ((q % 4) + 4) % 4;
  let m = I;
  const one: Mat =
    axis === 0
      ? [
          [1, 0, 0],
          [0, 0, -1],
          [0, 1, 0],
        ]
      : axis === 1
        ? [
            [0, 0, 1],
            [0, 1, 0],
            [-1, 0, 0],
          ]
        : [
            [0, -1, 0],
            [1, 0, 0],
            [0, 0, 1],
          ];
  for (let i = 0; i < k; i++) m = mul(one, m);
  return m;
};

// 軸まわりに任意の角度(ラジアン、正で反時計回り)回す行列。回している途中を描くのに使う
export const axisAngle = (axis: 0 | 1 | 2, a: number): number[][] => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  if (axis === 0) return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (axis === 1) return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
};

// 面記号 → [軸, 動く層, 時計回りの向き]
const BASE: Record<string, [0 | 1 | 2, number[], number]> = {
  R: [0, [1], -1],
  L: [0, [-1], 1],
  M: [0, [0], 1],
  r: [0, [0, 1], -1],
  l: [0, [-1, 0], 1],
  x: [0, [-1, 0, 1], -1],
  U: [1, [1], -1],
  D: [1, [-1], 1],
  E: [1, [0], 1],
  u: [1, [0, 1], -1],
  d: [1, [-1, 0], 1],
  y: [1, [-1, 0, 1], -1],
  F: [2, [1], -1],
  B: [2, [-1], 1],
  S: [2, [0], -1],
  f: [2, [0, 1], -1],
  b: [2, [-1, 0], 1],
  z: [2, [-1, 0, 1], -1],
};

export const parse = (alg: string): Move[] =>
  alg
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const m = token.match(/^([RLMUDEFBSrludfbxyz])(2?)('?)$/);
      if (!m) throw new Error(`unknown move: ${token}`);
      const [axis, layers, dir] = BASE[m[1]];
      const amount = token.includes('2') ? 2 : 1;
      const prime = token.includes("'") ? -1 : 1;
      return { token: token.replace("2'", '2'), axis, layers, turns: dir * amount * (amount === 2 ? 1 : prime) };
    });

export const invert = (moves: Move[]): Move[] =>
  [...moves].reverse().map((m) => ({
    ...m,
    turns: Math.abs(m.turns) === 2 ? m.turns : -m.turns,
    token: Math.abs(m.turns) === 2 ? m.token : m.token.endsWith("'") ? m.token.slice(0, -1) : `${m.token}'`,
  }));

export const inLayer = (c: Cubie, m: Move) => m.layers.includes(c.pos[m.axis]);

export const turn = (cube: Cube, m: Move): Cube => {
  const r = axisRot(m.axis, m.turns);
  return cube.map((c) => (inLayer(c, m) ? { ...c, pos: apply(r, c.pos), rot: mul(r, c.rot) } : c));
};

export const run = (cube: Cube, moves: Move[]): Cube => moves.reduce(turn, cube);

// 世界の面の法線 n に見えているシールの色(= そのシールの家の面の法線)
export const stickerHome = (c: Cubie, n: Vec): Vec => apply(transpose(c.rot), n);

const eq = (a: Vec, b: Vec) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const find = (cube: Cube, home: Vec) => cube.find((c) => eq(c.home, home))!;

// 持ち替え(y など)で全体が回っていたら、センターが家に戻るように全体を回し戻す
export const normalize = (cube: Cube): Cube => {
  const u = find(cube, [0, 1, 0]).pos;
  const f = find(cube, [0, 0, 1]).pos;
  const r: Vec = [u[1] * f[2] - u[2] * f[1], u[2] * f[0] - u[0] * f[2], u[0] * f[1] - u[1] * f[0]];
  const g: Mat = [
    [r[0], u[0], f[0]],
    [r[1], u[1], f[1]],
    [r[2], u[2], f[2]],
  ];
  const gi = transpose(g);
  return cube.map((c) => ({ ...c, pos: apply(gi, c.pos), rot: mul(gi, c.rot) }));
};

const isCenter = (c: Cubie) => Math.abs(c.home[0]) + Math.abs(c.home[1]) + Math.abs(c.home[2]) <= 1;
export const isSolvedPiece = (c: Cubie) =>
  eq(c.pos, c.home) && (isCenter(c) || [0, 1, 2].every((i) => eq(c.rot[i], I[i])));

export const FR_CORNER: Vec = [1, -1, 1];
export const FR_EDGE: Vec = [1, 0, 1];
export const isPair = (c: Cubie) => eq(c.home, FR_CORNER) || eq(c.home, FR_EDGE);

// 右手前のスロット以外の 1・2 段目が揃っていて、ペアが U 面かスロットにあること
export const isF2LCase = (cube: Cube) =>
  cube.every((c) => {
    if (c.home[1] === 1) return true;
    if (isPair(c)) return c.pos[1] === 1 || eq(c.pos, c.home);
    return isSolvedPiece(c);
  });

// ペア 2 個の位置と向きを、U の回し方(AUF)の違いを無視して文字列にする
export const signature = (cube: Cube) => {
  const U = parse('U')[0];
  const keys: string[] = [];
  let c = cube;
  for (let k = 0; k < 4; k++) {
    keys.push(
      c
        .filter(isPair)
        .map((p) => JSON.stringify([p.home, p.pos, p.rot]))
        .join('|'),
    );
    c = turn(c, U);
  }
  return keys.sort()[0];
};
