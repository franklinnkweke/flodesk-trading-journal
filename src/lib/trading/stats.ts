import { dateKey, weekdayIndex, WEEKDAYS } from "./time";

export interface StatTrade {
  id: string;
  symbol: string;
  pnl: number;
  r_multiple: number | null;
  opened_at: string;
  closed_at: string | null;
  session: string | null;
  setup_id: string | null;
  status?: string;
}

export interface TradeStats {
  count: number;
  wins: number;
  losses: number;
  breakeven: number;
  totalPnl: number;
  grossProfit: number;
  grossLoss: number;
  winRate: number; // 0-100
  profitFactor: number | null; // null = no losses
  avgR: number | null;
  expectancy: number; // money per trade
  expectancyR: number | null;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number; // money, positive number
  maxDrawdownPct: number; // 0-100, from peak equity
  streak: { kind: "win" | "loss" | "none"; count: number };
}

function closedTime(t: StatTrade) {
  return new Date(t.closed_at ?? t.opened_at).getTime();
}

export function sortByClose<T extends StatTrade>(trades: T[]): T[] {
  return [...trades].sort((a, b) => closedTime(a) - closedTime(b));
}

export function computeStats(input: StatTrade[], startingBalance = 0): TradeStats {
  const trades = sortByClose(input.filter((t) => t.status !== "open"));
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const totalPnl = grossProfit - grossLoss;
  const decided = wins.length + losses.length;
  const rs = trades.map((t) => t.r_multiple).filter((r): r is number => r != null);

  let equity = startingBalance;
  let peak = startingBalance;
  let maxDd = 0;
  let maxDdPct = 0;
  for (const t of trades) {
    equity += t.pnl;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDd) maxDd = dd;
    if (peak > 0 && (dd / peak) * 100 > maxDdPct) maxDdPct = (dd / peak) * 100;
  }

  let streak: TradeStats["streak"] = { kind: "none", count: 0 };
  for (let i = trades.length - 1; i >= 0; i--) {
    const p = trades[i].pnl;
    if (p === 0) continue;
    const kind = p > 0 ? "win" : "loss";
    if (streak.kind === "none") streak = { kind, count: 1 };
    else if (streak.kind === kind) streak.count++;
    else break;
  }

  return {
    count: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: trades.length - decided,
    totalPnl,
    grossProfit,
    grossLoss,
    winRate: decided ? (wins.length / decided) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
    avgR: rs.length ? rs.reduce((s, r) => s + r, 0) / rs.length : null,
    expectancy: trades.length ? totalPnl / trades.length : 0,
    expectancyR: rs.length ? rs.reduce((s, r) => s + r, 0) / rs.length : null,
    avgWin: wins.length ? grossProfit / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    maxDrawdown: maxDd,
    maxDrawdownPct: maxDdPct,
    streak,
  };
}

export function equityCurve(input: StatTrade[], startingBalance: number, tz: string) {
  const trades = sortByClose(input.filter((t) => t.status !== "open"));
  let equity = startingBalance;
  const points = [{ label: "Start", date: "", equity, pnl: 0 }];
  for (const t of trades) {
    equity += t.pnl;
    points.push({ label: t.symbol, date: dateKey(t.closed_at ?? t.opened_at, tz), equity: Math.round(equity * 100) / 100, pnl: t.pnl });
  }
  return points;
}

export interface Bucket {
  key: string;
  pnl: number;
  count: number;
  wins: number;
  winRate: number;
}

function bucketize(trades: StatTrade[], keyFn: (t: StatTrade) => string): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const t of trades) {
    if (t.status === "open") continue;
    const key = keyFn(t);
    const b = map.get(key) ?? { key, pnl: 0, count: 0, wins: 0, winRate: 0 };
    b.pnl += t.pnl;
    b.count++;
    if (t.pnl > 0) b.wins++;
    map.set(key, b);
  }
  return [...map.values()].map((b) => ({ ...b, pnl: Math.round(b.pnl * 100) / 100, winRate: b.count ? (b.wins / b.count) * 100 : 0 }));
}

export const bySymbol = (t: StatTrade[]) => bucketize(t, (x) => x.symbol).sort((a, b) => b.pnl - a.pnl);
export const bySession = (t: StatTrade[]) => {
  const order = ["Asia", "London", "New York", "Off-hours"];
  return bucketize(t, (x) => x.session ?? "Off-hours").sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
};
export const bySetup = (t: StatTrade[], names: Record<string, string>) =>
  bucketize(t, (x) => (x.setup_id ? names[x.setup_id] ?? "Unknown" : "No setup")).sort((a, b) => b.pnl - a.pnl);
export const byWeekday = (t: StatTrade[], tz: string) => {
  const b = bucketize(t, (x) => WEEKDAYS[weekdayIndex(x.closed_at ?? x.opened_at, tz)]);
  return WEEKDAYS.slice(0, 5)
    .map((d) => b.find((x) => x.key === d) ?? { key: d, pnl: 0, count: 0, wins: 0, winRate: 0 })
    .concat(b.filter((x) => x.key === "Sat" || x.key === "Sun"));
};
export const byDay = (t: StatTrade[], tz: string) => bucketize(t, (x) => dateKey(x.closed_at ?? x.opened_at, tz));

/** % of trades with zero rule breaks. */
export function disciplineScore(trades: { id: string }[], breakCountByTrade: Record<string, number>) {
  if (!trades.length) return null;
  const clean = trades.filter((t) => !breakCountByTrade[t.id]).length;
  return (clean / trades.length) * 100;
}
