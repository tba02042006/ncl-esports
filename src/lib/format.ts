/** Deterministic across Node/browser ICU versions. Uzbekistan is UTC+5 year-round. */
export function formatUzt(value: string, withTime = false): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "—";
  const d = new Date(timestamp + 5 * 3600000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
  return withTime
    ? `${day} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UZT`
    : day;
}
