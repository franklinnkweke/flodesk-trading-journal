import { normalizeSymbol } from "./symbols";

export interface ImportedTrade {
  external_deal_id: string | null;
  symbol: string;
  direction: "long" | "short";
  lots: number;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  exit_price: number | null;
  opened_at: string;
  closed_at: string | null;
  commission: number;
  swap: number;
  profit: number;
  /** Net: profit + commission + swap. */
  pnl: number;
}

const clean = (s: string) => s.replace(/\u00a0/g, " ").trim();

function toNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  const s = clean(raw).replace(/\s/g, "").replace(/,(?=\d{3}(\D|$))/g, "");
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Parses "2024.05.13 10:15:32", "2024-05-13 10:15" or ISO into an ISO string (treated as UTC/server time). */
export function parseMtTime(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = clean(raw).match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})[ T]?(\d{1,2})?:?(\d{2})?:?(\d{2})?/);
  if (!m) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)).toISOString();
}

const norm = (h: string) => clean(h).toLowerCase().replace(/[\s/._]/g, "");

/** Finds the positions table in a 2D grid of cells and turns its rows into trades. */
export function parseRows(rows: string[][], knownSymbols?: string[]): ImportedTrade[] {
  const headerIdx = rows.findIndex((r) => {
    const n = r.map(norm);
    return n.includes("symbol") && n.includes("type") && n.includes("profit") && (n.includes("volume") || n.includes("lots") || n.includes("size"));
  });
  if (headerIdx < 0) return [];
  const header = rows[headerIdx].map(norm);
  const all = (names: string[]) => header.map((h, i) => (names.includes(h) ? i : -1)).filter((i) => i >= 0);
  const one = (names: string[]) => all(names)[0] ?? -1;

  const times = all(["time", "opentime", "closetime"]);
  const prices = all(["price", "openprice", "closeprice"]);
  const col = {
    id: one(["position", "ticket", "deal", "order", "id"]),
    symbol: one(["symbol"]),
    type: one(["type"]),
    volume: one(["volume", "lots", "size"]),
    sl: one(["sl", "s/l", "stoploss"]),
    tp: one(["tp", "t/p", "takeprofit"]),
    commission: one(["commission"]),
    swap: one(["swap"]),
    profit: one(["profit"]),
    openTime: times[0] ?? -1,
    closeTime: times[1] ?? -1,
    openPrice: prices[0] ?? -1,
    closePrice: prices[1] ?? -1,
  };

  const out: ImportedTrade[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (c: number) => (c >= 0 ? r[c] : undefined);
    const type = clean(get(col.type) ?? "").toLowerCase();
    if (!type) {
      // A blank/section row after data ends the table.
      if (out.length && r.filter((c) => clean(c)).length <= 1) break;
      continue;
    }
    if (!type.startsWith("buy") && !type.startsWith("sell")) continue;
    const symbolRaw = clean(get(col.symbol) ?? "");
    const opened = parseMtTime(get(col.openTime));
    if (!symbolRaw || !opened) continue;
    const lots = toNumber(get(col.volume)?.split("/")[0]) ?? 0;
    const commission = toNumber(get(col.commission)) ?? 0;
    const swap = toNumber(get(col.swap)) ?? 0;
    const profit = toNumber(get(col.profit)) ?? 0;
    const sl = toNumber(get(col.sl));
    const tp = toNumber(get(col.tp));
    out.push({
      external_deal_id: clean(get(col.id) ?? "") || null,
      symbol: normalizeSymbol(symbolRaw, knownSymbols),
      direction: type.startsWith("buy") ? "long" : "short",
      lots,
      entry_price: toNumber(get(col.openPrice)),
      stop_loss: sl && sl !== 0 ? sl : null,
      take_profit: tp && tp !== 0 ? tp : null,
      exit_price: toNumber(get(col.closePrice)),
      opened_at: opened,
      closed_at: parseMtTime(get(col.closeTime)),
      commission,
      swap,
      profit,
      pnl: Math.round((profit + commission + swap) * 100) / 100,
    });
  }
  return out;
}

export function parseCsv(text: string): string[][] {
  const firstLines = text.split(/\r?\n/).slice(0, 10).join("\n");
  const delim = [",", ";", "\t"].map((d) => [d, firstLines.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Browser-only: parses the HTML report MT5 exports from Account History. */
export function parseHtmlRows(html: string): string[][] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll("tr")).map((tr) => {
    const cells: string[] = [];
    tr.querySelectorAll("th,td").forEach((td) => {
      const el = td as HTMLTableCellElement;
      if (el.classList.contains("hidden") || el.getAttribute("style")?.includes("display: none")) return;
      const span = Number(el.getAttribute("colspan") || 1);
      cells.push(el.textContent ?? "");
      for (let k = 1; k < span; k++) cells.push("");
    });
    return cells;
  });
}

/** MT5 HTML reports are usually UTF-16LE; detect the BOM and decode accordingly. */
export function decodeReport(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf.slice(0, 2));
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(buf);
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(buf);
  return new TextDecoder("utf-8").decode(buf);
}

export function parseReport(text: string, fileName: string, knownSymbols?: string[]): ImportedTrade[] {
  const isHtml = /\.html?$/i.test(fileName) || /<table/i.test(text.slice(0, 5000));
  return parseRows(isHtml ? parseHtmlRows(text) : parseCsv(text), knownSymbols);
}
