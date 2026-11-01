import { formatCompact, formatMoney } from "@/lib/format";
import type { CategorySummary, DailyTotal } from "@/lib/types";
import { eachDay } from "@/lib/format";

const PALETTE = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#a855f7", "#84cc16", "#ec4899"];

/** Grouped daily income/expense bars rendered with SVG attributes (no inline styles). */
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
  const days = eachDay(start, end);
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const rows = days.map((date) => ({
    date,
    income: byDate.get(date)?.totalIncome ?? 0,
    expense: byDate.get(date)?.totalExpense ?? 0,
  }));
  const max = Math.max(1, ...rows.flatMap((r) => [r.income, r.expense]));

  const W = 720;
  const H = 180;
  const padX = 8;
  const padBottom = 22;
  const slot = (W - padX * 2) / Math.max(rows.length, 1);
  const barW = Math.max(2, Math.min(14, slot / 2 - 1));
  const chartH = H - padBottom - 8;
  const labelEvery = Math.ceil(rows.length / 10);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Grafik pemasukan dan pengeluaran harian"
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
          <g key={r.date}>
            <title>{`${r.date}\nPemasukan: ${formatMoney(r.income, currency)}\nPengeluaran: ${formatMoney(r.expense, currency)}`}</title>
            <rect x={cx - barW} y={H - padBottom - hi} width={barW} height={hi} rx={2} fill="var(--income)" />
            <rect x={cx} y={H - padBottom - he} width={barW} height={he} rx={2} fill="var(--expense)" />
            {i % labelEvery === 0 && (
              <text x={cx} y={H - 6} fontSize={10} textAnchor="middle" fill="currentColor" opacity={0.6}>
                {r.date.slice(8)}
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
