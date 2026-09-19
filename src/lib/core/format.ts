/** ミリ秒を `12.34` / `1:23.45` 形式にする。切り捨て(競技の慣習に合わせる)。 */
export function fmt(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '-';
  const cs = Math.floor(ms / 10);
  const s = Math.floor(cs / 100);
  const c = cs % 100;
  const cc = String(c).padStart(2, '0');
  if (s < 60) return `${s}.${cc}`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}.${cc}`;
}

/** 区間表示用の小数1桁。 */
export function fmt1(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '-';
  return (ms / 1000).toFixed(1);
}

/** 履歴の `9/19 21:05`。 */
export function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const p = (v: number) => String(v).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
