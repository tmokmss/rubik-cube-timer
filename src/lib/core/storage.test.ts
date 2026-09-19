// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyStore, loadStore, saveStore } from './storage';
import { STORAGE_KEY, type StoreData } from './types';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('loadStore', () => {
  it('何も無ければ記録は空で始まる', () => {
    const { data, canSave } = loadStore();
    expect(data.solves).toEqual([]);
    expect(data).toEqual(emptyStore());
    expect(canSave).toBe(true);
  });

  it('保存済みの記録を読む', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: '3',
        goalMs: 45_000,
        solves: [{ id: 'a', at: 'x', total: 1, splits: [], scramble: '' }],
      }),
    );
    const { data } = loadStore();
    expect(data.mode).toBe('3');
    expect(data.goalMs).toBe(45_000);
    expect(data.solves).toHaveLength(1);
  });

  it('goalMs を持たない古いデータもそのまま読める(30秒とみなす)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: '3', solves: [] }));
    expect(loadStore().data.goalMs).toBe(30_000);
  });

  it('deleted を持たない古いデータもそのまま読める(墓標なしとみなす)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: '4', goalMs: 30_000, solves: [{ id: 'a', at: 'x', total: 1, splits: [], scramble: '' }] }),
    );
    const { data } = loadStore();
    expect(data.deleted).toEqual([]);
    expect(data.solves).toHaveLength(1);
  });

  it('使わなくなった seeded が残っていても無視して読める', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: '4',
        goalMs: 30_000,
        seeded: true,
        solves: [{ id: 'a', at: 'x', total: 1, splits: [], scramble: '' }],
      }),
    );
    const { data } = loadStore();
    expect(data.solves).toHaveLength(1);
    expect(data).not.toHaveProperty('seeded');
  });

  it('知らない mode / goalMs は既定値に落とす', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: '9', goalMs: 25_000, solves: [] }),
    );
    const { data } = loadStore();
    expect(data.mode).toBe('4');
    expect(data.goalMs).toBe(30_000);
  });

  it('solves が配列でなければ既定値に落とす', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: '4', solves: 'nope' }));
    expect(loadStore().data).toEqual(emptyStore());
  });

  it('JSON が壊れていても落ちない', () => {
    localStorage.setItem(STORAGE_KEY, '{ broken');
    const r = loadStore();
    expect(r.data).toEqual(emptyStore());
    expect(r.canSave).toBe(false);
  });
});

describe('saveStore', () => {
  it('書いたものを読み戻せる', () => {
    const data: StoreData = { mode: '1', goalMs: 45_000, solves: [], deleted: [] };
    expect(saveStore(data)).toBe(true);
    expect(loadStore().data).toEqual(data);
  });

  it('記録を勝手に足さない', () => {
    saveStore(emptyStore());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).solves).toEqual([]);
  });

  it('書けない環境では false を返して落ちない', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(saveStore(emptyStore())).toBe(false);
  });
});
