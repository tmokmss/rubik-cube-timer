import { describe, expect, it } from 'vitest';
import { mergeAll, mergeDocs, parseSyncDoc, reviveTombstones, tombstoneFor } from './sync';
import type { Solve } from './types';

function solve(id: string, at: string, total: number): Solve {
  return { id, at, total, splits: [], scramble: '' };
}

const a = solve('a', '2026-09-01T00:00:00.000Z', 30_000);
const b = solve('b', '2026-09-02T00:00:00.000Z', 31_000);
const c = solve('c', '2026-09-03T00:00:00.000Z', 32_000);

describe('mergeDocs', () => {
  it('両方にしか無い記録を足して時系列に並べる', () => {
    const r = mergeDocs({ solves: [a, b], deleted: [] }, { solves: [c], deleted: [] });
    expect(r.solves.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(r.added).toBe(1);
    expect(r.removed).toBe(0);
  });

  it('同じ記録は二重にならない', () => {
    const r = mergeDocs({ solves: [a, b], deleted: [] }, { solves: [a, b], deleted: [] });
    expect(r.solves).toHaveLength(2);
    expect(r.added).toBe(0);
  });

  it('id が違っても日時と合計が同じなら同一とみなす', () => {
    const dup = solve('other-id', a.at, a.total);
    const r = mergeDocs({ solves: [a], deleted: [] }, { solves: [dup], deleted: [] });
    expect(r.solves).toHaveLength(1);
    expect(r.added).toBe(0);
  });

  it('相手が消した記録は手元からも消える', () => {
    const r = mergeDocs(
      { solves: [a, b], deleted: [] },
      { solves: [], deleted: [tombstoneFor(b)] },
    );
    expect(r.solves.map((s) => s.id)).toEqual(['a']);
    expect(r.removed).toBe(1);
  });

  it('手元で消した記録は相手から復活しない(これが墓標の目的)', () => {
    const r = mergeDocs(
      { solves: [a], deleted: [tombstoneFor(b)] },
      { solves: [a, b], deleted: [] },
    );
    expect(r.solves.map((s) => s.id)).toEqual(['a']);
    expect(r.added).toBe(0);
  });

  it('id を振り直された同一記録も復活しない', () => {
    const reimported = solve('csv-1', b.at, b.total);
    const r = mergeDocs(
      { solves: [a], deleted: [tombstoneFor(b)] },
      { solves: [a, reimported], deleted: [] },
    );
    expect(r.solves.map((s) => s.id)).toEqual(['a']);
  });

  it('墓標は和集合で持ち回る', () => {
    const r = mergeDocs(
      { solves: [], deleted: [tombstoneFor(a)] },
      { solves: [], deleted: [tombstoneFor(b)] },
    );
    expect(r.deleted.map((t) => t.id).sort()).toEqual(['a', 'b']);
  });

  it('1年より古い墓標は落とす', () => {
    const old = tombstoneFor(b, '2020-01-01T00:00:00.000Z');
    const r = mergeDocs({ solves: [], deleted: [old] }, { solves: [b], deleted: [] });
    expect(r.solves.map((s) => s.id)).toEqual(['b']);
    expect(r.deleted).toHaveLength(0);
  });

  it('相手が空でも手元は消えない(初回同期)', () => {
    const r = mergeDocs({ solves: [a, b], deleted: [] }, { solves: [], deleted: [] });
    expect(r.solves).toHaveLength(2);
    expect(r.removed).toBe(0);
  });

  it('壊れた側があっても落ちない', () => {
    const r = mergeDocs(
      { solves: [a], deleted: [null as never, { id: 'x' } as never] },
      { solves: [], deleted: [] },
    );
    expect(r.solves.map((s) => s.id)).toEqual(['a']);
    expect(r.deleted).toHaveLength(0);
  });
});

describe('reviveTombstones', () => {
  it('明示的に取り込み直した記録の墓標は外す', () => {
    const left = reviveTombstones([tombstoneFor(a), tombstoneFor(b)], [b]);
    expect(left.map((t) => t.id)).toEqual(['a']);
  });
});

describe('parseSyncDoc', () => {
  it('中身を検証して取り出す', () => {
    expect(parseSyncDoc({ solves: [a], deleted: [] })).toEqual({ solves: [a], deleted: [] });
  });

  it('deleted が無くても読める', () => {
    expect(parseSyncDoc({ solves: [] })?.deleted).toEqual([]);
  });

  it('壊れていれば null', () => {
    expect(parseSyncDoc(null)).toBeNull();
    expect(parseSyncDoc({ nope: 1 })).toBeNull();
    expect(parseSyncDoc('{}')).toBeNull();
  });
});

describe('mergeAll', () => {
  it('複数のファイルを全部混ぜる(初回同期がぶつかって2つできた場合)', () => {
    const r = mergeAll({ solves: [a], deleted: [] }, [
      { solves: [b], deleted: [] },
      { solves: [c], deleted: [] },
    ]);
    expect(r.solves.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(r.added).toBe(2);
  });

  it('どのファイルの墓標でも消える', () => {
    const r = mergeAll({ solves: [a, b], deleted: [] }, [
      { solves: [], deleted: [] },
      { solves: [], deleted: [tombstoneFor(b)] },
    ]);
    expect(r.solves.map((s) => s.id)).toEqual(['a']);
    expect(r.removed).toBe(1);
  });

  it('相手が1つも無くても、重複を畳んで期限切れの墓標を落とす', () => {
    const dup = solve('other-id', a.at, a.total);
    const old = { ...tombstoneFor(c), at: '2020-01-01T00:00:00.000Z' };
    const r = mergeAll({ solves: [a, dup], deleted: [old] }, []);
    expect(r.solves.map((s) => s.id)).toEqual(['a']);
    expect(r.deleted).toEqual([]);
    expect(r.added).toBe(0);
  });
});
