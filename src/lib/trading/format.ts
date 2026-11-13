export function money(n: number | null | undefined, currency = "USD", opts: { signed?: boolean; compact?: boolean } = {}) {
  if (n == null || Number.isNaN(n)) return "—";
  const f = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: opts.compact && Math.abs(n) >= 10000 ? 1 : 2,
    minimumFractionDigits: opts.compact && Math.abs(n) >= 10000 ? 0 : 2,
    notation: opts.compact && Math.abs(n) >= 10000 ? "compact" : "standard",
  });
  const s = f.format(Math.abs(n));
  if (n < 0) return `−${s}`;
  return opts.signed && n > 0 ? `+${s}` : s;
}

export function num(n: number | null | undefined, dp = 2, signed = false) {
  if (n == null || Number.isNaN(n)) return "—";
  const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  if (n < 0) return `−${s}`;
  return signed && n > 0 ? `+${s}` : s;
}

export function pct(n: number | null | undefined, dp = 1, signed = false) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${num(n, dp, signed)}%`;
}

export function rMult(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${num(n, 2, true)}R`;
}

export function price(n: number | null | undefined) {
  if (n == null) return "—";
  const abs = Math.abs(n);
  const dp = abs >= 1000 ? 2 : abs >= 50 ? 3 : 5;
  return n.toLocaleString("en-US", { minimumFractionDigits: Math.min(dp, 2), maximumFractionDigits: dp });
}

/** Tailwind text class for a P&L-like value. */
export function pnlTone(n: number | null | undefined) {
  if (n == null || n === 0) return "text-muted-foreground";
  return n > 0 ? "text-profit" : "text-loss";
}
