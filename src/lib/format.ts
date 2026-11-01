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

/** `YYYY-MM-DD` for a Date in the browser's local timezone. */
export function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Adds whole days/months to a `YYYY-MM-DD` string without timezone drift. */
export function shiftDate(dateStr: string, unit: "day" | "month", delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, unit === "month" ? 1 : d, 12));
  if (unit === "month") dt.setUTCMonth(dt.getUTCMonth() + delta);
  else dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
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
