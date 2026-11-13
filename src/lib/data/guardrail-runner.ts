import { supabase } from "@/integrations/supabase/client";
import { evaluateTrade, type GuardrailRules } from "@/lib/trading/guardrails";
import { DEFAULT_SESSION_TIMES, DEFAULT_TIMEZONE, type SessionTimes } from "@/lib/trading/time";

/**
 * Re-checks trades against the user's guardrails and replaces their automatic rule breaks.
 * Manual rule breaks (logged by the trader) are never touched.
 */
export async function recheckRuleBreaks(tradeIds?: string[]) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { checked: 0, breaks: 0 };
  const userId = u.user.id;

  const [rulesRes, tradesRes, accountsRes, newsRes, profileRes] = await Promise.all([
    supabase.from("guardrail_rules").select("*").maybeSingle(),
    supabase.from("trades").select("id, account_id, symbol, opened_at, closed_at, pnl, risk_amount, status").order("opened_at").limit(10000),
    supabase.from("trading_accounts").select("id, starting_balance, balance"),
    supabase.from("news_events").select("title, event_at, currency"),
    supabase.from("profiles").select("timezone, session_times").eq("id", userId).maybeSingle(),
  ]);
  if (!rulesRes.data || !tradesRes.data) return { checked: 0, breaks: 0 };
  const rules = rulesRes.data as unknown as GuardrailRules;
  const trades = tradesRes.data.map((t) => ({ ...t, pnl: Number(t.pnl), risk_amount: t.risk_amount == null ? null : Number(t.risk_amount) }));
  const accounts = new Map((accountsRes.data ?? []).map((a) => [a.id, a]));
  const tz = profileRes.data?.timezone || DEFAULT_TIMEZONE;
  const sessionTimes = (profileRes.data?.session_times as SessionTimes | null) ?? DEFAULT_SESSION_TIMES;

  const targets = tradeIds ? trades.filter((t) => tradeIds.includes(t.id)) : trades;
  const rows: { user_id: string; trade_id: string; rule: string; reason: string; source: string }[] = [];

  for (const t of targets) {
    const acc = accounts.get(t.account_id);
    const accTrades = trades.filter((x) => x.account_id === t.account_id);
    const priorPnl = accTrades
      .filter((x) => x.closed_at && new Date(x.closed_at).getTime() <= new Date(t.opened_at).getTime() && x.id !== t.id)
      .reduce((s, x) => s + x.pnl, 0);
    const start = Number(acc?.starting_balance ?? 0);
    const balance = start > 0 ? start + priorPnl : Number(acc?.balance ?? 0);
    const breaks = evaluateTrade(t, { rules, balance, otherTrades: trades, news: newsRes.data ?? [], tz, sessionTimes });
    for (const b of breaks) rows.push({ user_id: userId, trade_id: t.id, rule: b.rule, reason: b.reason, source: "auto" });
  }

  const ids = targets.map((t) => t.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await supabase.from("rule_breaks").delete().eq("source", "auto").in("trade_id", ids.slice(i, i + 200));
    if (error) throw error;
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("rule_breaks").insert(rows.slice(i, i + 500));
    if (error) throw error;
  }
  return { checked: targets.length, breaks: rows.length };
}
