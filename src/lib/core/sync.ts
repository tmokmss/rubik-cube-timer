import { solveSignature, type Solve, type Tombstone } from './types';

/** Drive の appDataFolder に置くファイルの中身。 */
export interface SyncDoc {
  /** スキーマを変えたときの判別用。 */
  version: 1;
  /** 最後に書いた時刻。人が見るためだけで、マージの判断には使わない。 */
  updatedAt: string;
  solves: Solve[];
  deleted: Tombstone[];
}

export const SYNC_FILE_NAME = 'cube-split-timer.json';

/**
 * 1年より古い墓標は落とす。
 * これより長く同期していない端末が繋がると、そこで消した記録は復活しうる。
 */
const TOMBSTONE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export function tombstoneFor(s: Solve, at: string = new Date().toISOString()): Tombstone {
  return { id: s.id, sig: solveSignature(s), at };
}

export interface SyncSide {
  solves: Solve[];
  deleted: Tombstone[];
}

export interface MergeDocsResult extends SyncSide {
  /** 相手から新しく入ってきた件数。 */
  added: number;
  /** 相手の削除が伝わって手元から消えた件数。 */
  removed: number;
}

/**
 * 端末間のマージ。
 *
 * 記録は和集合(片方にしか無いものは両方に入る)。ただし墓標に当たるものは消したままにする。
 * 和集合だけだと「消した」が伝わらず、片方で消しても相手から復活してしまう。
 */
export function mergeDocs(local: SyncSide, remote: SyncSide, now = Date.now()): MergeDocsResult {
  const fresh = (t: Tombstone) => {
    const age = now - new Date(t.at).getTime();
    return !Number.isFinite(age) || age <= TOMBSTONE_TTL_MS;
  };

  // 墓標は和集合。同じ id は先に消した方を残す。
  const tombs = new Map<string, Tombstone>();
  for (const t of [...(local.deleted ?? []), ...(remote.deleted ?? [])]) {
    if (!t || typeof t.id !== 'string' || typeof t.sig !== 'string') continue;
    if (!fresh(t)) continue;
    const prev = tombs.get(t.id);
    if (!prev || t.at < prev.at) tombs.set(t.id, t);
  }
  const deadIds = new Set([...tombs.values()].map((t) => t.id));
  const deadSigs = new Set([...tombs.values()].map((t) => t.sig));
  const isDead = (s: Solve) => deadIds.has(s.id) || deadSigs.has(solveSignature(s));

  const seenIds = new Set<string>();
  const seenSigs = new Set<string>();
  const solves: Solve[] = [];
  let removed = 0;
  let added = 0;

  for (const s of local.solves ?? []) {
    if (isDead(s)) {
      removed++;
      continue;
    }
    const sig = solveSignature(s);
    if (seenIds.has(s.id) || seenSigs.has(sig)) continue;
    seenIds.add(s.id);
    seenSigs.add(sig);
    solves.push(s);
  }

  for (const s of remote.solves ?? []) {
    if (isDead(s)) continue;
    const sig = solveSignature(s);
    if (seenIds.has(s.id) || seenSigs.has(sig)) continue;
    seenIds.add(s.id);
    seenSigs.add(sig);
    solves.push(s);
    added++;
  }

  solves.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return { solves, deleted: [...tombs.values()], added, removed };
}

/**
 * 手元と、Drive から拾った中身をまとめてマージする。
 *
 * ファイルは常に1つのはずだが、2台の初回同期がぶつかると2つできうる。
 * 片方を無視すると、そちらにしか無い記録が取り残されるので、見つかった分は全部混ぜる。
 * 相手が1つも無いときも1回通して、期限切れの墓標を落とし、重複を畳んでおく。
 */
export function mergeAll(local: SyncSide, remotes: SyncSide[], now = Date.now()): MergeDocsResult {
  let side: SyncSide = local;
  let added = 0;
  let removed = 0;
  for (const remote of remotes.length ? remotes : [{ solves: [], deleted: [] }]) {
    const m = mergeDocs(side, remote, now);
    side = { solves: m.solves, deleted: m.deleted };
    added += m.added;
    removed += m.removed;
  }
  return { ...side, added, removed };
}

/** 取り込んだ記録に対応する墓標を外す(明示的に入れ直したのだから復活させる)。 */
export function reviveTombstones(deleted: Tombstone[], revived: Solve[]): Tombstone[] {
  const ids = new Set(revived.map((s) => s.id));
  const sigs = new Set(revived.map(solveSignature));
  return deleted.filter((t) => !ids.has(t.id) && !sigs.has(t.sig));
}

/** Drive から落としてきた中身を検証する。壊れていれば null。 */
export function parseSyncDoc(raw: unknown): SyncSide | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<SyncDoc>;
  if (!Array.isArray(d.solves)) return null;
  return {
    solves: d.solves,
    deleted: Array.isArray(d.deleted) ? d.deleted : [],
  };
}
