// F2L 41 ケース(右手前スロット)。番号とグループは SpeedCubeDB に合わせている。
// 手順は各ケースの上位から、持ち替え(y)の要らない R / U / F / L だけのものを選んだ。
// 6 と 8 だけはそれが無いので r を含む。正しさは f2l.test.ts で確かめている。

export type F2LGroup =
  | 'Free Pairs'
  | 'Disconnected Pairs'
  | 'Connected Pairs'
  | 'Corner In Slot'
  | 'Edge In Slot'
  | 'Pieces In Slot';

export type F2LCase = { id: number; group: F2LGroup; alg: string };

export const F2L_GROUPS: Array<{ key: F2LGroup; title: string }> = [
  { key: 'Free Pairs', title: '基本形' },
  { key: 'Disconnected Pairs', title: '離れたペア' },
  { key: 'Connected Pairs', title: 'くっついたペア' },
  { key: 'Corner In Slot', title: '角がスロットにある' },
  { key: 'Edge In Slot', title: '辺がスロットにある' },
  { key: 'Pieces In Slot', title: '両方スロットにある' },
];

export const F2L_CASES: F2LCase[] = [
  { id: 1, group: 'Free Pairs', alg: "U R U' R'" },
  { id: 2, group: 'Free Pairs', alg: "F R' F' R" },
  { id: 3, group: 'Free Pairs', alg: "F' U' F" },
  { id: 4, group: 'Free Pairs', alg: "R U R'" },
  { id: 5, group: 'Disconnected Pairs', alg: "U' R U R' U2 R U' R'" },
  { id: 6, group: 'Disconnected Pairs', alg: "U' r U' R' U R U r'" },
  { id: 7, group: 'Disconnected Pairs', alg: "U' R U2 R' U' R U2 R'" },
  { id: 8, group: 'Disconnected Pairs', alg: "r' U2 R2 U R2 U r" },
  { id: 9, group: 'Disconnected Pairs', alg: "U' R U' R' U F' U' F" },
  { id: 10, group: 'Disconnected Pairs', alg: "U' R U R' U R U R'" },
  { id: 11, group: 'Connected Pairs', alg: "U' R U2 R' U F' U' F" },
  { id: 12, group: 'Connected Pairs', alg: "R U' R' U R U' R' U2 R U' R'" },
  { id: 13, group: 'Connected Pairs', alg: "R U' R' U R' F R F' R U' R'" },
  { id: 14, group: 'Connected Pairs', alg: "U' R U' R' U R U R'" },
  { id: 15, group: 'Connected Pairs', alg: "R U R' U2 R U' R' U R U' R'" },
  { id: 16, group: 'Connected Pairs', alg: "R U' R' U2 F' U' F" },
  { id: 17, group: 'Connected Pairs', alg: "R U2 R' U' R U R'" },
  { id: 18, group: 'Connected Pairs', alg: "F' U2 F U F' U' F" },
  { id: 19, group: 'Disconnected Pairs', alg: "U R U2 R' U R U' R'" },
  { id: 20, group: 'Disconnected Pairs', alg: "U' R U' R2 F R F' R U' R'" },
  { id: 21, group: 'Disconnected Pairs', alg: "U2 R U R' U R U' R'" },
  { id: 22, group: 'Disconnected Pairs', alg: "F' L' U2 L F" },
  { id: 23, group: 'Connected Pairs', alg: "U R U' R' U' R U' R' U R U' R'" },
  { id: 24, group: 'Connected Pairs', alg: "F U R U' R' F' R U' R'" },
  { id: 25, group: 'Corner In Slot', alg: "U' R' F R F' R U R'" },
  { id: 26, group: 'Corner In Slot', alg: "U R U' R' F R' F' R" },
  { id: 27, group: 'Corner In Slot', alg: "R U' R' U R U' R'" },
  { id: 28, group: 'Corner In Slot', alg: "R U R' U' F R' F' R" },
  { id: 29, group: 'Corner In Slot', alg: "R' F R F' U R U' R'" },
  { id: 30, group: 'Corner In Slot', alg: "R U R' U' R U R'" },
  { id: 31, group: 'Edge In Slot', alg: "U' R' F R F' R U' R'" },
  { id: 32, group: 'Edge In Slot', alg: "U R U' R' U R U' R' U R U' R'" },
  { id: 33, group: 'Edge In Slot', alg: "U' R U' R' U2 R U' R'" },
  { id: 34, group: 'Edge In Slot', alg: "U R U R' U2 R U R'" },
  { id: 35, group: 'Edge In Slot', alg: "U' R U R' U F' U' F" },
  { id: 36, group: 'Edge In Slot', alg: "U F' U' F U' R U R'" },
  { id: 37, group: 'Pieces In Slot', alg: "R2 U2 F R2 F' U2 R' U R'" },
  { id: 38, group: 'Pieces In Slot', alg: "R U' R' U' R U R' U2 R U' R'" },
  { id: 39, group: 'Pieces In Slot', alg: "R U' R' U R U2 R' U R U' R'" },
  { id: 40, group: 'Pieces In Slot', alg: "F' L' U2 L F R U R'" },
  { id: 41, group: 'Pieces In Slot', alg: "R U' R' F' L' U2 L F" },
];
