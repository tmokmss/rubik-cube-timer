import { isPair, type Cubie, type Vec } from './core/cube';
import type { AlgSetName } from './core/algs';

const COLORS: Array<{ n: Vec; color: string }> = [
  { n: [0, 1, 0], color: '#ffd500' },
  { n: [0, -1, 0], color: '#ffffff' },
  { n: [0, 0, 1], color: '#00a651' },
  { n: [0, 0, -1], color: '#0046ad' },
  { n: [1, 0, 0], color: '#ff6a00' },
  { n: [-1, 0, 0], color: '#c8102e' },
];
const GREY = '#7b818c';

/**
 * ピースの家の面 n に貼られたシールの色。シールが無い面は null。
 * 見るべきところだけに色を付ける: F2L は上の段のペア以外、OLL は上の段の黄色以外を灰色にする。
 */
export function stickerColor(set: AlgSetName, c: Cubie, n: Vec): string | null {
  if (![0, 1, 2].some((i) => n[i] !== 0 && n[i] === c.home[i])) return null;
  if (c.home[1] === 1) {
    if (set === 'F2L' && !isPair(c)) return GREY;
    if (set === 'OLL' && n[1] !== 1) return GREY;
  }
  return COLORS.find((f) => f.n.every((v, i) => v === n[i]))!.color;
}
