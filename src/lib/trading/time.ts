export const DEFAULT_TIMEZONE = "Africa/Lagos";

export type SessionName = "Asia" | "London" | "New York";
export type SessionTimes = Record<string, { start: string; end: string }>;

/** Session windows in UTC (HH:MM). */
export const DEFAULT_SESSION_TIMES: SessionTimes = {
  Asia: { start: "00:00", end: "07:00" },
  London: { start: "07:00", end: "12:00" },
  "New York": { start: "12:00", end: "21:00" },
};

export const SESSIONS: SessionName[] = ["Asia", "London", "New York"];

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function inWindow(mins: number, start: string, end: string) {
  const s = toMinutes(start);
  const e = toMinutes(end);
  return s <= e ? mins >= s && mins < e : mins >= s || mins < e;
}

/** Which session a timestamp falls in, using UTC session windows. Earlier sessions win on overlap. */
export function sessionFor(iso: string | Date, times: SessionTimes = DEFAULT_SESSION_TIMES): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  for (const name of Object.keys(times)) {
    const w = times[name];
    if (w && inWindow(mins, w.start, w.end)) return name;
  }
  return "Off-hours";
}

/** Minutes-since-midnight of a timestamp in a timezone. */
export function localMinutes(iso: string | Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(
    typeof iso === "string" ? new Date(iso) : iso,
  );
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function isWithinHours(iso: string | Date, tz: string, start: string, end: string) {
  return inWindow(localMinutes(iso, tz), start, end);
}

/** YYYY-MM-DD for a timestamp in the given timezone. */
export function dateKey(iso: string | Date, tz: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    typeof iso === "string" ? new Date(iso) : iso,
  );
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function weekdayIndex(iso: string | Date, tz: string = DEFAULT_TIMEZONE): number {
  const key = dateKey(iso, tz);
  const [y, m, d] = key.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sun
  return (dow + 6) % 7; // 0 = Mon
}

/** Monday (YYYY-MM-DD) of the week containing the timestamp, in the given timezone. */
export function weekKey(iso: string | Date, tz: string = DEFAULT_TIMEZONE): string {
  const key = dateKey(iso, tz);
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - weekdayIndex(iso, tz));
  return dt.toISOString().slice(0, 10);
}

export function formatDateTime(iso: string | null | undefined, tz: string = DEFAULT_TIMEZONE) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined, tz: string = DEFAULT_TIMEZONE) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

export const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];
