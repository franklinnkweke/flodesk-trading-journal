export type SymbolCategory = "fx" | "fx_jpy" | "metal" | "index" | "crypto";

export interface SymbolSetting {
  symbol: string;
  category: SymbolCategory | string;
  pip_size: number;
  contract_size: number;
  quote_currency: string;
  /** Fallback pip value per 1.00 lot in the account currency, used when it can't be derived. */
  pip_value_per_lot: number;
}

export const DEFAULT_SYMBOL_SETTINGS: SymbolSetting[] = [
  { symbol: "EURUSD", category: "fx", pip_size: 0.0001, contract_size: 100000, quote_currency: "USD", pip_value_per_lot: 10 },
  { symbol: "GBPUSD", category: "fx", pip_size: 0.0001, contract_size: 100000, quote_currency: "USD", pip_value_per_lot: 10 },
  { symbol: "AUDUSD", category: "fx", pip_size: 0.0001, contract_size: 100000, quote_currency: "USD", pip_value_per_lot: 10 },
  { symbol: "NZDUSD", category: "fx", pip_size: 0.0001, contract_size: 100000, quote_currency: "USD", pip_value_per_lot: 10 },
  { symbol: "USDCAD", category: "fx", pip_size: 0.0001, contract_size: 100000, quote_currency: "CAD", pip_value_per_lot: 7.3 },
  { symbol: "USDCHF", category: "fx", pip_size: 0.0001, contract_size: 100000, quote_currency: "CHF", pip_value_per_lot: 11.3 },
  { symbol: "EURGBP", category: "fx", pip_size: 0.0001, contract_size: 100000, quote_currency: "GBP", pip_value_per_lot: 12.7 },
  { symbol: "USDJPY", category: "fx_jpy", pip_size: 0.01, contract_size: 100000, quote_currency: "JPY", pip_value_per_lot: 6.6 },
  { symbol: "EURJPY", category: "fx_jpy", pip_size: 0.01, contract_size: 100000, quote_currency: "JPY", pip_value_per_lot: 6.6 },
  { symbol: "GBPJPY", category: "fx_jpy", pip_size: 0.01, contract_size: 100000, quote_currency: "JPY", pip_value_per_lot: 6.6 },
  { symbol: "XAUUSD", category: "metal", pip_size: 0.1, contract_size: 100, quote_currency: "USD", pip_value_per_lot: 10 },
  { symbol: "US30", category: "index", pip_size: 1, contract_size: 1, quote_currency: "USD", pip_value_per_lot: 1 },
  { symbol: "NAS100", category: "index", pip_size: 1, contract_size: 1, quote_currency: "USD", pip_value_per_lot: 1 },
  { symbol: "GER40", category: "index", pip_size: 1, contract_size: 1, quote_currency: "EUR", pip_value_per_lot: 1.08 },
  { symbol: "BTCUSD", category: "crypto", pip_size: 1, contract_size: 1, quote_currency: "USD", pip_value_per_lot: 1 },
];

const ALIASES: Record<string, string> = {
  GOLD: "XAUUSD",
  DJ30: "US30",
  DJI: "US30",
  WS30: "US30",
  USA30: "US30",
  USTEC: "NAS100",
  NAS: "NAS100",
  NDX: "NAS100",
  US100: "NAS100",
  USTECH: "NAS100",
  DE40: "GER40",
  DAX: "GER40",
  GER30: "GER40",
  DE30: "GER40",
  BTCUSDT: "BTCUSD",
  BITCOIN: "BTCUSD",
};

/** Turns broker symbols like "EURUSDm", "XAUUSD.r", "US30.cash" or "GOLD" into the canonical symbol. */
export function normalizeSymbol(raw: string, known: string[] = DEFAULT_SYMBOL_SETTINGS.map((s) => s.symbol)): string {
  const up = raw.trim().toUpperCase();
  const core = up.replace(/[^A-Z0-9]/g, "");
  for (const [alias, target] of Object.entries(ALIASES)) {
    if (core === alias || core.startsWith(alias) && !known.some((k) => core.startsWith(k))) return target;
  }
  const sorted = [...known].sort((a, b) => b.length - a.length);
  const hit = sorted.find((k) => core.startsWith(k));
  return hit ?? up.split(/[.\s_-]/)[0];
}

export function findSetting(settings: SymbolSetting[], symbol: string): SymbolSetting | undefined {
  const norm = normalizeSymbol(symbol, settings.map((s) => s.symbol));
  return settings.find((s) => s.symbol === norm);
}

/**
 * Value of one pip for 1.00 lot, in the account currency.
 * - Quote currency == account currency (EURUSD, XAUUSD, US30 on a USD account): pip size x contract size.
 * - Base currency == account currency (USDJPY, USDCAD on a USD account): pip size x contract size / price.
 * - Otherwise (crosses, other-currency indices): the editable fallback from symbol settings.
 */
export function pipValuePerLot(setting: SymbolSetting, price: number | null | undefined, accountCurrency = "USD"): number {
  const raw = setting.pip_size * setting.contract_size;
  if (setting.quote_currency === accountCurrency) return raw;
  if (setting.symbol.startsWith(accountCurrency) && price && price > 0) return raw / price;
  return setting.pip_value_per_lot;
}

export function priceToPips(priceDiff: number, setting: SymbolSetting): number {
  return priceDiff / setting.pip_size;
}

export interface PositionInput {
  balance: number;
  riskMode: "percent" | "amount";
  riskValue: number;
  entry: number;
  stopLoss: number;
  takeProfit?: number | null;
  setting: SymbolSetting;
  accountCurrency?: string;
  lotStep?: number;
}

export interface PositionResult {
  direction: "long" | "short";
  stopPips: number;
  takeProfitPips: number | null;
  pipValuePerLot: number;
  targetRisk: number;
  lots: number;
  moneyAtRisk: number;
  rr: number | null;
  potentialProfit: number | null;
  riskPctOfBalance: number;
}

export function calculatePosition(input: PositionInput): PositionResult | null {
  const { balance, riskMode, riskValue, entry, stopLoss, takeProfit, setting } = input;
  const accountCurrency = input.accountCurrency ?? "USD";
  const step = input.lotStep ?? 0.01;
  if (!(entry > 0) || !(stopLoss > 0) || entry === stopLoss || !(riskValue > 0)) return null;

  const direction = stopLoss < entry ? "long" : "short";
  const stopPips = Math.abs(priceToPips(entry - stopLoss, setting));
  const pv = pipValuePerLot(setting, entry, accountCurrency);
  const targetRisk = riskMode === "percent" ? (balance * riskValue) / 100 : riskValue;
  const rawLots = targetRisk / (stopPips * pv);
  // Round down so the position never risks more than the target.
  const lots = Math.max(0, Math.floor(rawLots / step + 1e-9) * step);
  const roundedLots = Number(lots.toFixed(2));
  const moneyAtRisk = roundedLots * stopPips * pv;

  let takeProfitPips: number | null = null;
  let rr: number | null = null;
  let potentialProfit: number | null = null;
  if (takeProfit && takeProfit > 0) {
    const tpOnRightSide = direction === "long" ? takeProfit > entry : takeProfit < entry;
    if (tpOnRightSide) {
      takeProfitPips = Math.abs(priceToPips(takeProfit - entry, setting));
      rr = takeProfitPips / stopPips;
      potentialProfit = roundedLots * takeProfitPips * pv;
    }
  }

  return {
    direction,
    stopPips,
    takeProfitPips,
    pipValuePerLot: pv,
    targetRisk,
    lots: roundedLots,
    moneyAtRisk,
    rr,
    potentialProfit,
    riskPctOfBalance: balance > 0 ? (moneyAtRisk / balance) * 100 : 0,
  };
}

/** Derived fields for a stored trade: pips moved, money at risk at entry, and R-multiple. */
export function deriveTradeMetrics(
  t: { direction: string; lots: number; entry_price: number | null; stop_loss: number | null; exit_price: number | null; pnl: number },
  setting: SymbolSetting | undefined,
  accountCurrency = "USD",
): { pips: number | null; risk_amount: number | null; r_multiple: number | null } {
  if (!setting || t.entry_price == null) return { pips: null, risk_amount: null, r_multiple: null };
  const sgn = t.direction === "short" ? -1 : 1;
  const pips = t.exit_price != null ? round((sgn * (t.exit_price - t.entry_price)) / setting.pip_size, 1) : null;
  let risk_amount: number | null = null;
  if (t.stop_loss != null && t.stop_loss !== t.entry_price) {
    const pv = pipValuePerLot(setting, t.entry_price, accountCurrency);
    risk_amount = round((Math.abs(t.entry_price - t.stop_loss) / setting.pip_size) * pv * t.lots, 2);
  }
  const r_multiple = risk_amount && risk_amount > 0 ? round(t.pnl / risk_amount, 2) : null;
  return { pips, risk_amount, r_multiple };
}

export function round(n: number, dp = 2) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
