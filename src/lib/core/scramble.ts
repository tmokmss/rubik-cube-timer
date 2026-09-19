const FACES = ['U', 'D', 'R', 'L', 'F', 'B'] as const;
/** 同じ軸の面(U/D, R/L, F/B)を判別するための軸番号。 */
const AXIS = [0, 0, 1, 1, 2, 2] as const;
const SUFFIX = ['', "'", '2'] as const;

/**
 * 20手のスクランブル。同じ面の連続と、同じ軸3手連続を避ける。
 * `rng` を差し替えられるのはテストのため。
 */
export function makeScramble(rng: () => number = Math.random): string {
  const out: string[] = [];
  let last = -1;
  let prev = -1;
  while (out.length < 20) {
    const f = Math.floor(rng() * 6);
    if (f === last) continue;
    if (last >= 0 && prev >= 0 && AXIS[f] === AXIS[last] && AXIS[f] === AXIS[prev]) continue;
    out.push(FACES[f] + SUFFIX[Math.floor(rng() * 3)]);
    prev = last;
    last = f;
  }
  return out.join(' ');
}
