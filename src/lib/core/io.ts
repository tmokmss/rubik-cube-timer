import { stageMs } from './stats';
import { SPLIT_STAGES, type Solve, type Split, type StageName } from './types';

export const CSV_HEADER = 'date,total_s,cross,f2l,oll,pll,ll,scramble';

const CSV_COLUMNS: ReadonlyArray<StageName> = ['Cross', 'F2L', 'OLL', 'PLL', 'LL'];

/* ------------------------------ export ------------------------------ */

export function toCsv(solves: Solve[]): string {
  const rows = solves.map((r) => {
    const g = (n: StageName) => {
      const v = stageMs(r, n);
      return v == null ? '' : (v / 1000).toFixed(2);
    };
    return [
      r.at,
      (r.total / 1000).toFixed(2),
      ...CSV_COLUMNS.map(g),
      `"${(r.scramble ?? '').replace(/"/g, '""')}"`,
    ].join(',');
  });
  return [CSV_HEADER, ...rows].join('\n');
}

export function toJson(solves: Solve[]): string {
  return JSON.stringify(
    { app: 'cube-split-timer', version: 1, exportedAt: new Date().toISOString(), solves },
    null,
    2,
  );
}

/* ------------------------------ import ------------------------------ */

export class ImportError extends Error {}

/** ダブルクォート対応の最小限の CSV 行パーサ。 */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

let idSeq = 0;
function newId(): string {
  idSeq += 1;
  return `im${Date.now().toString(36)}${idSeq.toString(36)}${Math.floor(Math.random() * 1296)
    .toString(36)
    .padStart(2, '0')}`;
}

function normalizeSolve(raw: unknown, fallbackId: () => string): Solve | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const total = Number(r.total);
  if (!Number.isFinite(total) || total <= 0) return null;
  const at = typeof r.at === 'string' ? r.at : '';
  if (!at || Number.isNaN(new Date(at).getTime())) return null;

  const splits: Split[] = [];
  if (Array.isArray(r.splits)) {
    for (const s of r.splits) {
      if (!s || typeof s !== 'object') continue;
      const name = (s as Record<string, unknown>).name;
      const ms = Number((s as Record<string, unknown>).ms);
      if (typeof name !== 'string' || !Number.isFinite(ms)) continue;
      splits.push({ name: name as StageName, ms: Math.round(ms) });
    }
  }
  return {
    id: typeof r.id === 'string' && r.id ? r.id : fallbackId(),
    at,
    total: Math.round(total),
    splits,
    scramble: typeof r.scramble === 'string' ? r.scramble : '',
  };
}

function fromCsv(text: string): Solve[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lines.length) throw new ImportError('CSV が空です。');

  const head = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => head.indexOf(name);
  const iDate = idx('date');
  const iTotal = idx('total_s');
  if (iDate < 0 || iTotal < 0) {
    throw new ImportError(`CSV の1行目が見出しになっていません。期待する形式: ${CSV_HEADER}`);
  }
  const stageIdx = SPLIT_STAGES.map((n) => [n, idx(n.toLowerCase())] as const);
  const iScramble = idx('scramble');

  const out: Solve[] = [];
  for (const line of lines.slice(1)) {
    const c = parseCsvLine(line);
    const total = Number(c[iTotal]) * 1000;
    const at = (c[iDate] ?? '').trim();
    if (!Number.isFinite(total) || total <= 0 || !at) continue;
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) continue;

    const splits: Split[] = [];
    for (const [name, i] of stageIdx) {
      if (i < 0) continue;
      const v = (c[i] ?? '').trim();
      if (v === '') continue;
      const ms = Number(v) * 1000;
      if (!Number.isFinite(ms)) continue;
      splits.push({ name, ms: Math.round(ms) });
    }
    // OLL/PLL が揃っているなら LL は冗長なので落とす(stageMs が合成する)。
    const has = new Set(splits.map((s) => s.name));
    const trimmed =
      has.has('OLL') && has.has('PLL') ? splits.filter((s) => s.name !== 'LL') : splits;

    out.push({
      id: newId(),
      at: d.toISOString(),
      total: Math.round(total),
      splits: trimmed,
      scramble: iScramble >= 0 ? (c[iScramble] ?? '').trim() : '',
    });
  }
  if (!out.length) throw new ImportError('取り込める行がありませんでした。');
  return out;
}

function fromJson(text: string): Solve[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError('JSON として読めませんでした。');
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { solves?: unknown }).solves)
      ? (parsed as { solves: unknown[] }).solves
      : null;
  if (!list) throw new ImportError('`solves` の配列が見つかりませんでした。');

  const out = list
    .map((r) => normalizeSolve(r, newId))
    .filter((s): s is Solve => s != null);
  if (!out.length) throw new ImportError('取り込める記録がありませんでした。');
  return out;
}

/** JSON でも CSV でも受け取る。中身を見て判別する。 */
export function parseImport(text: string): Solve[] {
  const t = text.trim();
  if (!t) throw new ImportError('中身が空です。');
  return t.startsWith('{') || t.startsWith('[') ? fromJson(t) : fromCsv(t);
}

/* ------------------------------ merge ------------------------------ */

/** id が違っても同じ瞬間・同じ合計なら同一の記録とみなす(CSV は id を持たないため)。 */
function signature(s: Solve): string {
  return `${new Date(s.at).getTime()}|${s.total}`;
}

export interface MergeResult {
  solves: Solve[];
  added: number;
  skipped: number;
}

export function mergeSolves(current: Solve[], incoming: Solve[]): MergeResult {
  const ids = new Set(current.map((s) => s.id));
  const sigs = new Set(current.map(signature));
  const merged = [...current];
  let added = 0;
  let skipped = 0;

  for (const s of incoming) {
    const sig = signature(s);
    if (ids.has(s.id) || sigs.has(sig)) {
      skipped++;
      continue;
    }
    ids.add(s.id);
    sigs.add(sig);
    merged.push(s);
    added++;
  }
  merged.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return { solves: merged, added, skipped };
}

/** ブラウザにファイルとして保存させる。 */
export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function stampedName(ext: string): string {
  const d = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `cube-times-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
}
