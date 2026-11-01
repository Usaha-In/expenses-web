"use client";

import { useState } from "react";
import { ConfirmModal } from "@/components/expense-form";
import { useSession } from "@/components/session";
import { ApiError, api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { Wallet } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export default function WalletsPage() {
  const { account } = useSession();
  const base = `accounts/${account.id}/wallets`;
  const { data, error, loading, reload } = useApi<{ wallets: Wallet[] }>(base);

  const [name, setName] = useState("");
  const [setAsMain, setSetAsMain] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Wallet | null>(null);

  const wallets = data?.wallets ?? [];
  const total = wallets.reduce((s, w) => s + w.remainingBalance, 0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await api(base, { method: "POST", body: { name: name.trim(), setAsMain } });
      setName("");
      setSetAsMain(false);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gagal membuat dompet.");
    } finally {
      setBusy(false);
    }
  }

  async function makeMain(w: Wallet) {
    try {
      await api(`${base}/main`, { method: "POST", body: { name: w.name } });
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gagal mengubah dompet utama.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Dompet</h1>
        {data && <p className="text-sm text-muted">Total saldo: <span className="font-semibold text-foreground">{formatMoney(total)}</span></p>}
      </div>

      {error && <p role="alert" className="card text-sm text-expense">{error}</p>}

      <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
        {wallets.map((w) => (
          <div key={w.id} className="card flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{w.name}</h2>
              {w.isMain && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">⭐ Utama</span>}
            </div>
            <p className="text-2xl font-semibold">{formatMoney(w.remainingBalance, w.currency)}</p>
            <p className="text-xs text-muted">
              Masuk {formatMoney(w.totalIncome, w.currency)} · Keluar {formatMoney(w.totalExpense, w.currency)} · {w.transactionCount} transaksi
            </p>
            {!w.isMain && (
              <div className="mt-1 flex gap-2">
                <button className="btn !px-2 !py-1" onClick={() => void makeMain(w)}>Jadikan utama</button>
                <button className="btn !px-2 !py-1" onClick={() => setDeleting(w)}>Hapus</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={add} className="card max-w-md space-y-3">
        <h2 className="text-sm font-semibold">Tambah dompet</h2>
        <div>
          <label className="label" htmlFor="w-name">Nama</label>
          <input id="w-name" className="input" maxLength={100} required value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. BCA, Gopay, Tunai" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={setAsMain} onChange={(e) => setSetAsMain(e.target.checked)} />
          Jadikan dompet utama
        </label>
        {formError && <p role="alert" className="text-sm text-expense">{formError}</p>}
        <button className="btn btn-primary" disabled={busy || !name.trim()}>
          {busy ? "Menyimpan…" : "Tambah"}
        </button>
      </form>

      {deleting && (
        <ConfirmModal
          title="Hapus dompet"
          message={`Hapus dompet "${deleting.name}"? Transaksi lama tetap tersimpan, namun tidak lagi terhubung ke dompet ini.`}
          confirmLabel="Hapus"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api(base, { method: "DELETE", query: { name: deleting.name } });
            setDeleting(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
