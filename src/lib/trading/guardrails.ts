import { normalizeSymbol } from "./symbols";
import { dateKey, isWithinHours, sessionFor, weekKey, type SessionTimes, DEFAULT_SESSION_TIMES } from "./time";

export interface GuardrailRules {
  max_risk_pct: number;
  max_daily_loss_pct: number;
  max_weekly_loss_pct: number;
  max_trades_per_day: number;
  max_consecutive_losses: number;
  allowed_sessions: string[];
  allowed_hours_start: string | null;
  allowed_hours_end: string | null;
  allowed_symbols: string[];
  news_window_minutes: number;
}

export interface GuardTrade {
  id: string;
  account_id?: string;
  symbol: string;
  opened_at: string;
  closed_at: string | null;
  pnl: number;
  risk_amount: number | null;
  status?: string;
}

export interface NewsEvent {
  title: string;
  event_at: string;
  currency?: string | null;
}

export interface RuleBreak {
  rule: string;
  reason: string;
}

export interface EvaluateContext {
  rules: GuardrailRules;
  /** Account balance just before the trade was opened. */
  balance: number;
  /** All of the user's other trades (any order); only ones that matter in time are used. */
  otherTrades: GuardTrade[];
  news?: NewsEvent[];
  tz: string;
  sessionTimes?: SessionTimes;
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const fmtPct = (n: number) => `${Math.round(n * 10) / 10}%`;

/** Checks one trade against the user's guardrails. Returns every rule it broke, with a reason. */
export function evaluateTrade(trade: GuardTrade, ctx: EvaluateContext): RuleBreak[] {
  const { rules, balance, tz } = ctx;
  const out: RuleBreak[] = [];
  const openedMs = new Date(trade.opened_at).getTime();
  const day = dateKey(trade.opened_at, tz);
  const week = weekKey(trade.opened_at, tz);
  const others = ctx.otherTrades.filter((t) => t.id !== trade.id);

  // Risk per trade
  if (trade.risk_amount != null && balance > 0 && rules.max_risk_pct > 0) {
    const riskPct = (trade.risk_amount / balance) * 100;
    if (riskPct > rules.max_risk_pct + 1e-9) {
      out.push({ rule: "max_risk", reason: `Risked ${fmtPct(riskPct)} of balance (limit ${fmtPct(rules.max_risk_pct)})` });
    }
  }

  // Session
  const session = sessionFor(trade.opened_at, ctx.sessionTimes ?? DEFAULT_SESSION_TIMES);
  if (rules.allowed_sessions.length && !rules.allowed_sessions.includes(session)) {
    out.push({
      rule: "session",
      reason: `Opened during ${session === "Off-hours" ? "off-hours" : `the ${session} session`} (allowed: ${rules.allowed_sessions.join(", ")})`,
    });
  }

  // Allowed hours (user's timezone)
  if (rules.allowed_hours_start && rules.allowed_hours_end) {
    if (!isWithinHours(trade.opened_at, tz, rules.allowed_hours_start, rules.allowed_hours_end)) {
      out.push({ rule: "hours", reason: `Opened outside allowed hours ${rules.allowed_hours_start}–${rules.allowed_hours_end}` });
    }
  }

  // Symbols
  if (rules.allowed_symbols.length) {
    const sym = normalizeSymbol(trade.symbol, rules.allowed_symbols);
    if (!rules.allowed_symbols.includes(sym)) {
      out.push({ rule: "symbol", reason: `${sym} isn't on your allowed symbols list` });
    }
  }

  // Trades per day
  const sameDayBefore = others.filter((t) => dateKey(t.opened_at, tz) === day && new Date(t.opened_at).getTime() < openedMs);
  if (rules.max_trades_per_day > 0 && sameDayBefore.length + 1 > rules.max_trades_per_day) {
    out.push({ rule: "max_trades", reason: `${ordinal(sameDayBefore.length + 1)} trade of the day (limit ${rules.max_trades_per_day})` });
  }

  // Losses realised before this trade was opened
  const closedBefore = others
    .filter((t) => t.status !== "open" && t.closed_at && new Date(t.closed_at).getTime() <= openedMs)
    .sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());

  if (balance > 0 && rules.max_daily_loss_pct > 0) {
    const dayPnl = closedBefore.filter((t) => dateKey(t.closed_at!, tz) === day).reduce((s, t) => s + t.pnl, 0);
    const lossPct = (-dayPnl / balance) * 100;
    if (lossPct >= rules.max_daily_loss_pct) {
      out.push({ rule: "daily_loss", reason: `Opened after the daily loss limit was hit (−${fmtPct(lossPct)} today, limit ${fmtPct(rules.max_daily_loss_pct)})` });
    }
  }

  if (balance > 0 && rules.max_weekly_loss_pct > 0) {
    const weekPnl = closedBefore.filter((t) => weekKey(t.closed_at!, tz) === week).reduce((s, t) => s + t.pnl, 0);
    const lossPct = (-weekPnl / balance) * 100;
    if (lossPct >= rules.max_weekly_loss_pct) {
      out.push({ rule: "weekly_loss", reason: `Opened after the weekly loss limit was hit (−${fmtPct(lossPct)} this week, limit ${fmtPct(rules.max_weekly_loss_pct)})` });
    }
  }

  if (rules.max_consecutive_losses > 0) {
    let run = 0;
    for (let i = closedBefore.length - 1; i >= 0; i--) {
      if (closedBefore[i].pnl < 0) run++;
      else if (closedBefore[i].pnl > 0) break;
    }
    if (run >= rules.max_consecutive_losses) {
      out.push({ rule: "consecutive_losses", reason: `Opened after ${run} losses in a row (limit ${rules.max_consecutive_losses})` });
    }
  }

  // News window
  if (rules.news_window_minutes > 0 && ctx.news?.length) {
    const win = rules.news_window_minutes * 60_000;
    const hit = ctx.news.find((n) => Math.abs(new Date(n.event_at).getTime() - openedMs) <= win);
    if (hit) {
      const diff = Math.round((new Date(hit.event_at).getTime() - openedMs) / 60_000);
      const when = diff >= 0 ? `${diff} min before` : `${-diff} min after`;
      out.push({ rule: "news_window", reason: `Opened ${when} "${hit.title}" (window ${rules.news_window_minutes} min)` });
    }
  }

  return out;
}

export type Level = "ok" | "warn" | "breached";

export interface LimitStatus {
  key: "daily_loss" | "weekly_loss" | "trades_today" | "consecutive_losses";
  label: string;
  used: number;
  limit: number;
  /** 0..1+ */
  ratio: number;
  level: Level;
  usedLabel: string;
  limitLabel: string;
}

const levelFor = (ratio: number): Level => (ratio >= 1 ? "breached" : ratio >= 0.7 ? "warn" : "ok");

/** Today's usage vs limits for the live status panel and the app-wide banner. */
export function todayStatus(rules: GuardrailRules, trades: GuardTrade[], balance: number, tz: string, now = new Date()): LimitStatus[] {
  const today = dateKey(now, tz);
  const week = weekKey(now, tz);
  const closed = trades.filter((t) => t.status !== "open" && t.closed_at);
  const dayPnl = closed.filter((t) => dateKey(t.closed_at!, tz) === today).reduce((s, t) => s + t.pnl, 0);
  const weekPnl = closed.filter((t) => weekKey(t.closed_at!, tz) === week).reduce((s, t) => s + t.pnl, 0);
  const tradesToday = trades.filter((t) => dateKey(t.opened_at, tz) === today).length;
  const sorted = [...closed].sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());
  let run = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].pnl < 0) run++;
    else if (sorted[i].pnl > 0) break;
  }
  const dayLossPct = balance > 0 ? Math.max(0, (-dayPnl / balance) * 100) : 0;
  const weekLossPct = balance > 0 ? Math.max(0, (-weekPnl / balance) * 100) : 0;
  const r = (u: number, l: number) => (l > 0 ? u / l : 0);

  return [
    {
      key: "daily_loss",
      label: "Daily loss",
      used: dayLossPct,
      limit: rules.max_daily_loss_pct,
      ratio: r(dayLossPct, rules.max_daily_loss_pct),
      level: levelFor(r(dayLossPct, rules.max_daily_loss_pct)),
      usedLabel: fmtPct(dayLossPct),
      limitLabel: fmtPct(rules.max_daily_loss_pct),
    },
    {
      key: "weekly_loss",
      label: "Weekly loss",
      used: weekLossPct,
      limit: rules.max_weekly_loss_pct,
      ratio: r(weekLossPct, rules.max_weekly_loss_pct),
      level: levelFor(r(weekLossPct, rules.max_weekly_loss_pct)),
      usedLabel: fmtPct(weekLossPct),
      limitLabel: fmtPct(rules.max_weekly_loss_pct),
    },
    {
      key: "trades_today",
      label: "Trades today",
      used: tradesToday,
      limit: rules.max_trades_per_day,
      ratio: r(tradesToday, rules.max_trades_per_day),
      level: levelFor(r(tradesToday, rules.max_trades_per_day)),
      usedLabel: String(tradesToday),
      limitLabel: String(rules.max_trades_per_day),
    },
    {
      key: "consecutive_losses",
      label: "Losses in a row",
      used: run,
      limit: rules.max_consecutive_losses,
      ratio: r(run, rules.max_consecutive_losses),
      level: levelFor(r(run, rules.max_consecutive_losses)),
      usedLabel: String(run),
      limitLabel: String(rules.max_consecutive_losses),
    },
  ];
}

export function bannerMessage(statuses: LimitStatus[]): string | null {
  const b = (k: LimitStatus["key"]) => statuses.find((s) => s.key === k)?.level === "breached";
  if (b("daily_loss")) return "Daily limit reached — stop trading for today";
  if (b("weekly_loss")) return "Weekly loss limit reached — stop trading until next week";
  if (b("consecutive_losses")) return "Max losses in a row reached — step away for today";
  if (b("trades_today")) return "Max trades for today reached — no more entries today";
  return null;
}

export const RULE_LABELS: Record<string, string> = {
  max_risk: "Over max risk",
  session: "Outside session",
  hours: "Outside hours",
  symbol: "Symbol not allowed",
  max_trades: "Too many trades",
  daily_loss: "Daily loss hit",
  weekly_loss: "Weekly loss hit",
  consecutive_losses: "Loss streak",
  news_window: "News window",
  moved_stop: "Moved stop",
  revenge_trade: "Revenge trade",
  other: "Other",
};
