"use client";

import Link from "next/link";
import { useState } from "react";
import { CategoryBars, DailyBars } from "@/components/charts";
import { useSession } from "@/components/session";
import { formatDateTime, formatMoney, shiftDate, toDateInput } from "@/lib/format";
import type { Dashboard, Period } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const PERIODS: Array<{ id: Period; label: string }> = [
  { id: "daily", label: "Harian" },
  { id: "weekly", label: "Mingguan" },
  { id: "monthly", label: "Bulanan" },
];

export default function DashboardPage() {
  const { account } = useSession();
  const [period, setPeriod] = useState<Period>("monthly");
  const [date, setDate] = useState<string>(""); // empty = current period (server decides)

  const { data, error, loading } = useApi<Dashboard>(`accounts/${account.id}/dashboard`, {
    period,
    date,
  });

  function step(delta: number) {
    if (!data || period === "weekly") return;
    const unit = period === "monthly" ? "month" : "day";
    setDate(shiftDate(data.startDate, unit, delta));
  }

  const todayStr = toDateInput(new Date());
  const atCurrent =
    data !== null && (period === "daily" ? data.startDate >= todayStr : data.endDate >= todayStr);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border bg-surface p-0.5" role="tablist">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={period === p.id}
              onClick={() => {
                setPeriod(p.id);
                setDate("");
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                period === p.id ? "bg-brand text-white dark:text-black" : "text-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period !== "weekly" && (
          <div className="flex items-center gap-1">
            <button className="btn" onClick={() => step(-1)} aria-label="Sebelumnya" disabled={!data}>
              ←
            </button>
            <button className="btn" onClick={() => step(1)} aria-label="Berikutnya" disabled={!data || atCurrent}>
              →
            </button>
            <button className="btn" onClick={() => setDate("")} disabled={date === ""}>
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
            <h2 className="mb-3 text-sm font-semibold">Arus kas harian</h2>
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
