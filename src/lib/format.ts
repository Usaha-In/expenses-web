export function formatMoney(amount: number, currency = "IDR"): string {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "IDR" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("id-ID")}`;
  }
}

export function formatCompact(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

/** `YYYY-MM-DD` for a Date in the browser's local timezone. */
export function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Adds whole days/months/years to a `YYYY-MM-DD` string without timezone drift. */
export function shiftDate(dateStr: string, unit: "day" | "month" | "year", delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(
    Date.UTC(
      y,
      unit === "year" ? 0 : m - 1,
      unit === "day" ? d : 1,
      12,
    ),
  );
  if (unit === "year") dt.setUTCFullYear(dt.getUTCFullYear() + delta);
  else if (unit === "month") dt.setUTCMonth(dt.getUTCMonth() + delta);
  else dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

export function startOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const dow = (dt.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const s = Date.UTC(sy, sm - 1, sd);
  const e = Date.UTC(ey, em - 1, ed);
  return Math.max(0, Math.round((e - s) / 86_400_000) + 1);
}

export function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  let cur = start;
  for (let i = 0; i < 62 && cur <= end; i++) {
    days.push(cur);
    cur = shiftDate(cur, "day", 1);
  }
  return days;
}

export function eachMonth(start: string, end: string): string[] {
  const months: string[] = [];
  let cur = `${start.slice(0, 7)}-01`;
  const endMonth = end.slice(0, 7);
  for (let i = 0; i < 120 && cur.slice(0, 7) <= endMonth; i++) {
    months.push(cur.slice(0, 7));
    cur = shiftDate(cur, "month", 1);
  }
  return months;
}
