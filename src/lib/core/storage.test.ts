// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyStore, loadStore, saveStore, seedSolves } from './storage';
import { STORAGE_KEY, type StoreData } from './types';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('loadStore', () => {
  it('何も無ければ既定値', () => {
    expect(loadStore()).toEqual({ data: emptyStore(), canSave: true });
  });

  it('goalMs を持たない v1 のデータもそのまま読める(30秒とみなす)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: '3', seeded: true, solves: [{ id: 'a', at: 'x', total: 1, splits: [], scramble: '' }] }),
    );
    const { data } = loadStore();
    expect(data.goalMs).toBe(30_000);
    expect(data.mode).toBe('3');
    expect(data.seeded).toBe(true);
    expect(data.solves).toHaveLength(1);
  });

  it('知らない mode / goalMs は既定値に落とす', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: '9', goalMs: 25_000, seeded: true, solves: [] }),
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
    const data: StoreData = { mode: '1', goalMs: 45_000, seeded: true, solves: [] };
    expect(saveStore(data)).toBe(true);
    expect(loadStore().data).toEqual(data);
  });

  it('書けない環境では false を返して落ちない', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(saveStore(emptyStore())).toBe(false);
  });
});

describe('seedSolves', () => {
  it('過去分9件を古い順で返す', () => {
    const s = seedSolves();
    expect(s).toHaveLength(9);
    expect(s.map((x) => x.id)).toContain('seed0');
    expect(s.every((x) => x.splits.length === 0)).toBe(true);
    for (let i = 1; i < s.length; i++) expect(s[i - 1].at <= s[i].at).toBe(true);
  });
});
