"use client";

import Link from "next/link";
import { useState } from "react";
import { CategoryBars, DailyBars } from "@/components/charts";
import { useSession } from "@/components/session";
import {
  MONTH_NAMES,
  daysBetween,
  formatDateTime,
  formatMoney,
  shiftDate,
  startOfWeek,
  toDateInput,
} from "@/lib/format";
import type { Dashboard, Period } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const PERIODS: Array<{ id: Period; label: string }> = [
  { id: "daily", label: "Harian" },
  { id: "weekly", label: "Mingguan" },
  { id: "monthly", label: "Bulanan" },
  { id: "yearly", label: "Tahunan" },
  { id: "custom", label: "Kustom" },
];

export default function DashboardPage() {
  const { account } = useSession();
  const todayStr = toDateInput(new Date());
  const currentYear = Number(todayStr.slice(0, 4));
  const defaultMonthStart = `${todayStr.slice(0, 7)}-01`;

  const [period, setPeriod] = useState<Period>("monthly");
  const [date, setDate] = useState<string>(""); // empty = current period (server decides)
  const [customStart, setCustomStart] = useState<string>(defaultMonthStart);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  const query =
    period === "custom"
      ? { period, startDate: customStart, endDate: customEnd }
      : { period, date };

  const { data, error, loading } = useApi<Dashboard>(`accounts/${account.id}/dashboard`, query);

  function selectPeriod(next: Period) {
    if (next === "custom" && period !== "custom" && data) {
      setCustomStart(data.startDate);
      setCustomEnd(data.endDate);
    }
    setPeriod(next);
    setDate("");
  }

  function applyDate(next: string) {
    if (!next) {
      setDate("");
      return;
    }
    if (period === "daily" && next === todayStr) setDate("");
    else if (period === "weekly") {
      const ws = startOfWeek(next);
      const we = shiftDate(ws, "day", 6);
      setDate(todayStr >= ws && todayStr <= we ? "" : next);
    } else if (period === "monthly" && next.slice(0, 7) === todayStr.slice(0, 7)) setDate("");
    else if (period === "yearly" && next.slice(0, 4) === todayStr.slice(0, 4)) setDate("");
    else setDate(next);
  }

  function step(delta: number) {
    if (period === "custom") return;
    const baseDate =
      date.length === 4
        ? `${date}-01-01`
        : date.length === 7
          ? `${date}-01`
          : date.length === 10
            ? date
            : data?.startDate ?? todayStr;
    if (period === "weekly") {
      const next = shiftDate(startOfWeek(baseDate), "day", delta * 7);
      applyDate(next);
      return;
    }
    const unit = period === "yearly" ? "year" : period === "monthly" ? "month" : "day";
    const next = shiftDate(baseDate, unit, delta);
    applyDate(next);
  }

  const refDate = date || (data?.period === period ? data.startDate : "") || todayStr;
  const selYearStr = refDate.slice(0, 4);
  const selMonthStr = refDate.length >= 7 ? refDate.slice(5, 7) : todayStr.slice(5, 7);
  const selYearNum = Number(selYearStr) || currentYear;
  const minYear = Math.min(currentYear - 10, selYearNum - 2);
  const maxYear = Math.max(currentYear + 1, selYearNum + 1);
  const yearOptions: number[] = [];
  for (let y = maxYear; y >= minYear; y--) yearOptions.push(y);

  const currentWeekStart = startOfWeek(todayStr);
  const atCurrent =
    period === "daily"
      ? refDate.slice(0, 10) >= todayStr
      : period === "weekly"
        ? startOfWeek(refDate.length === 10 ? refDate : todayStr) >= currentWeekStart
        : period === "monthly"
          ? `${selYearStr}-${selMonthStr}` >= todayStr.slice(0, 7)
          : period === "yearly"
            ? selYearStr >= todayStr.slice(0, 4)
            : true;

  const isMonthlyChart = data ? daysBetween(data.startDate, data.endDate) > 62 : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-lg border border-border bg-surface p-0.5" role="tablist">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={period === p.id}
              onClick={() => selectPeriod(p.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                period === p.id ? "bg-brand text-white dark:text-black" : "text-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === "custom" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <label htmlFor="custom-start" className="text-xs font-medium text-muted">
              Dari
            </label>
            <input
              id="custom-start"
              type="date"
              className="input !w-auto !py-1.5"
              value={customStart}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                setCustomStart(v);
                if (v > customEnd) setCustomEnd(v);
              }}
            />
            <label htmlFor="custom-end" className="text-xs font-medium text-muted">
              Sampai
            </label>
            <input
              id="custom-end"
              type="date"
              className="input !w-auto !py-1.5"
              value={customEnd}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                setCustomEnd(v);
                if (v < customStart) setCustomStart(v);
              }}
            />
            <button
              type="button"
              className="btn !py-1.5"
              onClick={() => {
                setCustomStart(defaultMonthStart);
                setCustomEnd(todayStr);
              }}
              disabled={customStart === defaultMonthStart && customEnd === todayStr}
            >
              Bulan ini
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            <button className="btn !py-1.5" onClick={() => step(-1)} aria-label="Sebelumnya" disabled={!data}>
              ←
            </button>

            {(period === "daily" || period === "weekly") && (
              <input
                type="date"
                aria-label="Pilih tanggal"
                className="input !w-auto !py-1.5"
                value={refDate.length === 10 ? refDate : todayStr}
                onChange={(e) => applyDate(e.target.value)}
              />
            )}

            {period === "monthly" && (
              <>
                <select
                  aria-label="Pilih bulan"
                  className="input !w-auto !py-1.5"
                  value={selMonthStr}
                  onChange={(e) => applyDate(`${selYearStr}-${e.target.value}`)}
                >
                  {MONTH_NAMES.map((name, idx) => {
                    const m = String(idx + 1).padStart(2, "0");
                    return (
                      <option key={m} value={m}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                <select
                  aria-label="Pilih tahun"
                  className="input !w-auto !py-1.5"
                  value={selYearStr}
                  onChange={(e) => applyDate(`${e.target.value}-${selMonthStr}`)}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </>
            )}

            {period === "yearly" && (
              <select
                aria-label="Pilih tahun"
                className="input !w-auto !py-1.5"
                value={selYearStr}
                onChange={(e) => applyDate(e.target.value)}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            )}

            <button className="btn !py-1.5" onClick={() => step(1)} aria-label="Berikutnya" disabled={!data || atCurrent}>
              →
            </button>
            <button className="btn !py-1.5" onClick={() => setDate("")} disabled={date === ""}>
              Sekarang
            </button>
          </div>
        )}

        <h1 className="ml-auto text-sm font-medium text-muted">{data?.periodLabel ?? "…"}</h1>
      </div>

      {error && (
        <p role="alert" className="card text-sm text-expense">
          {error}
        </p>
      )}

      <div className={`grid gap-3 sm:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
        <Stat label="Pemasukan" value={data?.summary.totalIncome} currency={data?.currency} tone="income" />
        <Stat label="Pengeluaran" value={data?.summary.totalExpense} currency={data?.currency} tone="expense" />
        <Stat label="Selisih periode" value={data?.summary.remainingBalance} currency={data?.currency} />
      </div>

      {data && (
        <div className={`grid gap-4 lg:grid-cols-5 ${loading ? "opacity-60" : ""}`}>
          <section className="card lg:col-span-3">
            <h2 className="mb-3 text-sm font-semibold">
              {isMonthlyChart ? "Arus kas bulanan" : "Arus kas harian"}
            </h2>
            <DailyBars daily={data.daily} start={data.startDate} end={data.endDate} currency={data.currency} />
            <p className="mt-2 flex gap-4 text-xs text-muted">
              <span>
                <span className="text-income">■</span> Pemasukan
              </span>
              <span>
                <span className="text-expense">■</span> Pengeluaran
              </span>
            </p>
          </section>
          <section className="card lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold">Pengeluaran per kategori</h2>
            <CategoryBars categories={data.summary.byCategory} currency={data.currency} />
          </section>
          <section className="card lg:col-span-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Transaksi terakhir</h2>
              <Link href="/transactions" className="text-sm text-brand hover:underline">
                Lihat semua →
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <p className="text-sm text-muted">Belum ada transaksi.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.recent.map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{tx.description || tx.category}</p>
                      <p className="text-xs text-muted">
                        {tx.category} · {formatDateTime(tx.transactionDate)}
                      </p>
                    </div>
                    <span className={tx.type === "income" ? "text-income" : "text-expense"}>
                      {tx.type === "income" ? "+" : "−"}
                      {formatMoney(tx.amount, tx.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value?: number;
  currency?: string;
  tone?: "income" | "expense";
}) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : ""}`}>
        {value === undefined ? "—" : formatMoney(value, currency)}
      </p>
    </div>
  );
}
