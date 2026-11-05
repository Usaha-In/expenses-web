import {
  MONTH_NAMES,
  SHORT_MONTH_NAMES,
  daysBetween,
  eachDay,
  eachMonth,
  formatCompact,
  formatMoney,
} from "@/lib/format";
import type { CategorySummary, DailyTotal } from "@/lib/types";

const PALETTE = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#a855f7", "#84cc16", "#ec4899"];

/** Grouped daily or monthly income/expense bars rendered with SVG attributes (no inline styles). */
export function DailyBars({
  daily,
  start,
  end,
  currency,
}: {
  daily: DailyTotal[];
  start: string;
  end: string;
  currency: string;
}) {
  const monthly = daysBetween(start, end) > 62;
  const rows: Array<{ key: string; label: string; title: string; income: number; expense: number }> = [];

  if (monthly) {
    const months = eachMonth(start, end);
    const sameYear = start.slice(0, 4) === end.slice(0, 4);
    const byMonth = new Map<string, { income: number; expense: number }>();
    for (const d of daily) {
      const ym = d.date.slice(0, 7);
      const cur = byMonth.get(ym) ?? { income: 0, expense: 0 };
      cur.income += d.totalIncome;
      cur.expense += d.totalExpense;
      byMonth.set(ym, cur);
    }
    for (const ym of months) {
      const mIdx = Math.max(0, Math.min(11, Number(ym.slice(5, 7)) - 1));
      const agg = byMonth.get(ym);
      rows.push({
        key: ym,
        label: sameYear ? SHORT_MONTH_NAMES[mIdx] : `${SHORT_MONTH_NAMES[mIdx]} '${ym.slice(2, 4)}`,
        title: `${MONTH_NAMES[mIdx]} ${ym.slice(0, 4)}`,
        income: agg?.income ?? 0,
        expense: agg?.expense ?? 0,
      });
    }
  } else {
    const days = eachDay(start, end);
    const crossMonth = start.slice(0, 7) !== end.slice(0, 7);
    const byDate = new Map(daily.map((d) => [d.date, d]));
    for (const date of days) {
      rows.push({
        key: date,
        label: crossMonth ? `${date.slice(8)}/${date.slice(5, 7)}` : date.slice(8),
        title: date,
        income: byDate.get(date)?.totalIncome ?? 0,
        expense: byDate.get(date)?.totalExpense ?? 0,
      });
    }
  }

  const max = Math.max(1, ...rows.flatMap((r) => [r.income, r.expense]));

  const W = 720;
  const H = 180;
  const padX = 8;
  const padBottom = 22;
  const slot = (W - padX * 2) / Math.max(rows.length, 1);
  const barW = Math.max(2, Math.min(14, slot / 2 - 1));
  const chartH = H - padBottom - 8;
  const maxLabels = monthly && start.slice(0, 4) === end.slice(0, 4) ? 12 : start.slice(0, 7) !== end.slice(0, 7) ? 8 : 10;
  const labelEvery = Math.max(1, Math.ceil(rows.length / maxLabels));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={monthly ? "Grafik pemasukan dan pengeluaran bulanan" : "Grafik pemasukan dan pengeluaran harian"}
      className="h-auto w-full"
    >
      <line x1={0} x2={W} y1={H - padBottom} y2={H - padBottom} stroke="currentColor" opacity={0.15} />
      <text x={2} y={10} fontSize={10} fill="currentColor" opacity={0.6}>
        {formatCompact(max)}
      </text>
      {rows.map((r, i) => {
        const cx = padX + slot * i + slot / 2;
        const he = (r.expense / max) * chartH;
        const hi = (r.income / max) * chartH;
        return (
          <g key={r.key}>
            <title>{`${r.title}\nPemasukan: ${formatMoney(r.income, currency)}\nPengeluaran: ${formatMoney(r.expense, currency)}`}</title>
            <rect x={cx - barW} y={H - padBottom - hi} width={barW} height={hi} rx={2} fill="var(--income)" />
            <rect x={cx} y={H - padBottom - he} width={barW} height={he} rx={2} fill="var(--expense)" />
            {i % labelEvery === 0 && (
              <text x={cx} y={H - 6} fontSize={10} textAnchor="middle" fill="currentColor" opacity={0.6}>
                {r.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function CategoryBars({
  categories,
  currency,
}: {
  categories: CategorySummary[];
  currency: string;
}) {
  const total = categories.reduce((s, c) => s + c.totalAmount, 0);
  if (categories.length === 0) {
    return <p className="text-sm text-muted">Belum ada pengeluaran pada periode ini.</p>;
  }
  return (
    <ul className="space-y-3">
      {categories.slice(0, 8).map((c, i) => {
        const pct = total > 0 ? (c.totalAmount / total) * 100 : 0;
        return (
          <li key={c.category}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">{c.category}</span>
              <span className="text-muted">
                {formatMoney(c.totalAmount, currency)} · {pct.toFixed(0)}%
              </span>
            </div>
            <svg viewBox="0 0 100 3" preserveAspectRatio="none" className="h-2 w-full" aria-hidden>
              <rect width={100} height={3} rx={1.5} fill="currentColor" opacity={0.1} />
              <rect width={Math.max(pct, 1)} height={3} rx={1.5} fill={PALETTE[i % PALETTE.length]} />
            </svg>
          </li>
        );
      })}
    </ul>
  );
}
