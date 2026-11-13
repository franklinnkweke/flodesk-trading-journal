import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { DEFAULT_SESSION_TIMES, DEFAULT_TIMEZONE, type SessionTimes } from "@/lib/trading/time";
import { DEFAULT_SYMBOL_SETTINGS, type SymbolSetting } from "@/lib/trading/symbols";

export type Trade = Tables<"trades">;
export type Account = Tables<"trading_accounts">;
export type Profile = Tables<"profiles">;
export type Setup = Tables<"setups">;
export type RuleBreakRow = Tables<"rule_breaks">;
export type EmotionRow = Tables<"emotion_logs">;
export type GuardrailRow = Tables<"guardrail_rules">;
export type NewsRow = Tables<"news_events">;
export type ChecklistTemplate = Tables<"checklist_templates">;
export type ChecklistItem = Tables<"checklist_items">;
export type ChecklistResult = Tables<"trade_checklist_results">;
export type DailyPlan = Tables<"daily_plans">;
export type Screenshot = Tables<"trade_screenshots">;

export const qk = {
  user: ["auth-user"] as const,
  profile: ["profile"] as const,
  accounts: ["accounts"] as const,
  trades: ["trades"] as const,
  setups: ["setups"] as const,
  breaks: ["rule-breaks"] as const,
  emotions: ["emotions"] as const,
  guardrails: ["guardrails"] as const,
  news: ["news"] as const,
  symbols: ["symbol-settings"] as const,
  checklist: ["checklist"] as const,
  checklistResults: ["checklist-results"] as const,
  plan: (date: string) => ["daily-plan", date] as const,
  screenshots: (tradeId: string) => ["screenshots", tradeId] as const,
  reports: ["ai-reports"] as const,
  messages: ["ai-messages"] as const,
};

/** Fetches every row (PostgREST caps a single request at 1000). */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; from < 20000; from += size) {
    const { data, error } = await build(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return out;
}

export function useUser() {
  return useQuery({
    queryKey: qk.user,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    staleTime: 60_000,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Timezone, sessions and base currency with defaults. */
export function usePrefs() {
  const { data } = useProfile();
  return {
    tz: data?.timezone || DEFAULT_TIMEZONE,
    currency: data?.base_currency || "USD",
    sessionTimes: ((data?.session_times as SessionTimes | null) ?? DEFAULT_SESSION_TIMES) as SessionTimes,
    profile: data,
  };
}

export function useAccounts() {
  return useQuery({
    queryKey: qk.accounts,
    queryFn: async () => {
      const { data, error } = await supabase.from("trading_accounts").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useTrades() {
  return useQuery({
    queryKey: qk.trades,
    queryFn: () =>
      fetchAll<Trade>((from, to) => supabase.from("trades").select("*").order("opened_at", { ascending: false }).range(from, to)),
  });
}

export function useSetups() {
  return useQuery({
    queryKey: qk.setups,
    queryFn: async () => {
      const { data, error } = await supabase.from("setups").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useRuleBreaks() {
  return useQuery({
    queryKey: qk.breaks,
    queryFn: () => fetchAll<RuleBreakRow>((f, t) => supabase.from("rule_breaks").select("*").order("created_at").range(f, t)),
  });
}

export function useEmotions() {
  return useQuery({
    queryKey: qk.emotions,
    queryFn: () => fetchAll<EmotionRow>((f, t) => supabase.from("emotion_logs").select("*").order("created_at").range(f, t)),
  });
}

export function useChecklistResults() {
  return useQuery({
    queryKey: qk.checklistResults,
    queryFn: () => fetchAll<ChecklistResult>((f, t) => supabase.from("trade_checklist_results").select("*").order("created_at").range(f, t)),
  });
}

export function useGuardrails() {
  return useQuery({
    queryKey: qk.guardrails,
    queryFn: async () => {
      const { data, error } = await supabase.from("guardrail_rules").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useNews() {
  return useQuery({
    queryKey: qk.news,
    queryFn: async () => {
      const { data, error } = await supabase.from("news_events").select("*").order("event_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
}

export function useSymbolSettings() {
  return useQuery({
    queryKey: qk.symbols,
    queryFn: async () => {
      const { data, error } = await supabase.from("symbol_settings").select("*").order("symbol");
      if (error) throw error;
      return data;
    },
  });
}

/** Symbol settings merged with built-in defaults. */
export function useSymbolList(): SymbolSetting[] {
  const { data } = useSymbolSettings();
  const rows = (data ?? []).map((r) => ({
    symbol: r.symbol,
    category: r.category,
    pip_size: Number(r.pip_size),
    contract_size: Number(r.contract_size),
    quote_currency: r.quote_currency,
    pip_value_per_lot: Number(r.pip_value_per_lot),
  }));
  const have = new Set(rows.map((r) => r.symbol));
  return [...rows, ...DEFAULT_SYMBOL_SETTINGS.filter((d) => !have.has(d.symbol))];
}

export function useChecklist() {
  return useQuery({
    queryKey: qk.checklist,
    queryFn: async () => {
      const [t, i] = await Promise.all([
        supabase.from("checklist_templates").select("*").order("created_at"),
        supabase.from("checklist_items").select("*").order("position"),
      ]);
      if (t.error) throw t.error;
      if (i.error) throw i.error;
      return { templates: t.data, items: i.data };
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: readonly (readonly unknown[])[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })));
}

export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}
