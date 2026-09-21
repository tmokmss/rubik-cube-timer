import { describe, expect, it } from 'vitest';
import { CSV_HEADER, ImportError, mergeSolves, parseCsvLine, parseImport, toCsv, toJson } from './io';
import type { Solve } from './types';

const four: Solve = {
  id: 'a1',
  at: '2026-09-19T01:00:00.000Z',
  total: 30_000,
  splits: [
    { name: 'Cross', ms: 4000 },
    { name: 'F2L', ms: 16_000 },
    { name: 'OLL', ms: 5000 },
    { name: 'PLL', ms: 5000 },
  ],
  scramble: "R U2 F'",
};
const plain: Solve = {
  id: 'a2',
  at: '2026-09-19T02:00:00.000Z',
  total: 58_230,
  splits: [],
};

describe('parseCsvLine', () => {
  it('引用符つきのフィールドを扱う', () => {
    expect(parseCsvLine('a,b,"c,d",e')).toEqual(['a', 'b', 'c,d', 'e']);
  });

  it('二重の引用符はひとつに戻す', () => {
    expect(parseCsvLine('"he said ""hi""",x')).toEqual(['he said "hi"', 'x']);
  });

  it('空のフィールドを保つ', () => {
    expect(parseCsvLine('a,,b')).toEqual(['a', '', 'b']);
  });
});

describe('toCsv', () => {
  it('見出しと、LL を合成した行を出す', () => {
    const lines = toCsv([four]).split('\n');
    expect(lines[0]).toBe(CSV_HEADER);
    expect(lines[1]).toBe('2026-09-19T01:00:00.000Z,30.00,4.00,16.00,5.00,5.00,10.00,"R U2 F\'"');
  });

  it('区間が無い記録は空欄になる', () => {
    expect(toCsv([plain]).split('\n')[1]).toBe('2026-09-19T02:00:00.000Z,58.23,,,,,,""');
  });
});

describe('parseImport', () => {
  it('書き出した JSON を読み戻せる', () => {
    const back = parseImport(toJson([four, plain]));
    expect(back).toEqual([four, plain]);
  });

  it('空の scramble は持たせない(過去の記録のぶんは保つ)', () => {
    const back = parseImport(toJson([four, plain]));
    expect(back[0].scramble).toBe("R U2 F'");
    expect('scramble' in back[1]).toBe(false);
  });

  it('素の配列も読める', () => {
    expect(parseImport(JSON.stringify([four]))[0].total).toBe(30_000);
  });

  it('書き出した CSV を読み戻せる(LL は落として OLL/PLL を残す)', () => {
    const back = parseImport(toCsv([four]));
    expect(back).toHaveLength(1);
    expect(back[0].total).toBe(30_000);
    expect(back[0].at).toBe(four.at);
    expect(back[0].scramble).toBe("R U2 F'");
    expect(back[0].splits.map((s) => s.name)).toEqual(['Cross', 'F2L', 'OLL', 'PLL']);
  });

  it('合計のみの CSV 行は splits 無しで読める', () => {
    const back = parseImport(toCsv([plain]));
    expect(back[0].splits).toEqual([]);
    expect(back[0].total).toBe(58_230);
  });

  it('3区間の CSV は LL を残す', () => {
    const csv = [CSV_HEADER, '2026-09-19T03:00:00.000Z,30.00,4.00,16.00,,,10.00,""'].join('\n');
    expect(parseImport(csv)[0].splits.map((s) => s.name)).toEqual(['Cross', 'F2L', 'LL']);
  });

  it('壊れた入力は ImportError', () => {
    expect(() => parseImport('')).toThrow(ImportError);
    expect(() => parseImport('{ oops')).toThrow(ImportError);
    expect(() => parseImport('{"nope":1}')).toThrow(ImportError);
    expect(() => parseImport('a,b,c\n1,2,3')).toThrow(ImportError);
  });

  it('総計が壊れている行は飛ばす', () => {
    const csv = [CSV_HEADER, '2026-09-19T03:00:00.000Z,abc,,,,,,""', '2026-09-19T04:00:00.000Z,12.00,,,,,,""'].join('\n');
    expect(parseImport(csv)).toHaveLength(1);
  });
});

describe('mergeSolves', () => {
  it('新しい記録だけ足して時系列に並べる', () => {
    const r = mergeSolves([plain], [four]);
    expect(r.added).toBe(1);
    expect(r.skipped).toBe(0);
    expect(r.solves.map((s) => s.id)).toEqual(['a1', 'a2']);
  });

  it('同じ id は飛ばす', () => {
    const r = mergeSolves([four], [four]);
    expect(r.added).toBe(0);
    expect(r.skipped).toBe(1);
  });

  it('id が違っても 日時と合計が同じなら同一とみなす(CSV 再取り込み)', () => {
    const again = parseImport(toCsv([four, plain]));
    const r = mergeSolves([four, plain], again);
    expect(r.added).toBe(0);
    expect(r.skipped).toBe(2);
    expect(r.solves).toHaveLength(2);
  });

  it('取り込み元を空にしても既存は消えない', () => {
    expect(mergeSolves([four], []).solves).toEqual([four]);
  });
});
