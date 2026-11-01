"use client";

import { useState } from "react";
import { ConfirmModal, ExpenseFormModal } from "@/components/expense-form";
import { useSession } from "@/components/session";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { CategoryUsage, Expense, ExpenseList, Wallet } from "@/lib/types";
import { useApi } from "@/lib/use-api";

interface Filters {
  search: string;
  type: "all" | "expense" | "income";
  category: string;
  wallet: string;
  startDate: string;
  endDate: string;
}

const EMPTY: Filters = { search: "", type: "all", category: "", wallet: "", startDate: "", endDate: "" };

export default function TransactionsPage() {
  const { account } = useSession();
  const base = `accounts/${account.id}`;

  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const list = useApi<ExpenseList>(`${base}/expenses`, {
    ...filters,
    type: filters.type === "all" ? undefined : filters.type,
    page,
    pageSize: 20,
  });
  const cats = useApi<CategoryUsage[]>(`${base}/categories`);
  const wallets = useApi<{ wallets: Wallet[] }>(`${base}/wallets`);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setFilters(draft);
  }

  const rows = list.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Transaksi</h1>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          + Tambah
        </button>
      </div>

      <form onSubmit={apply} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label className="label" htmlFor="f-search">Cari</label>
          <input id="f-search" className="input" placeholder="Deskripsi / kategori" maxLength={200} value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="f-type">Jenis</label>
          <select id="f-type" className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Filters["type"] })}>
            <option value="all">Semua</option>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-cat">Kategori</label>
          <select id="f-cat" className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            <option value="">Semua</option>
            {(cats.data ?? []).map((c) => (
              <option key={c.category} value={c.category}>{c.category}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-wallet">Dompet</label>
          <select id="f-wallet" className="input" value={draft.wallet} onChange={(e) => setDraft({ ...draft, wallet: e.target.value })}>
            <option value="">Semua</option>
            {(wallets.data?.wallets ?? []).map((w) => (
              <option key={w.id} value={w.name}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-3">
          <div>
            <label className="label" htmlFor="f-from">Dari</label>
            <input id="f-from" type="date" className="input" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="f-to">Sampai</label>
            <input id="f-to" type="date" className="input" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
          </div>
        </div>
        <div className="flex items-end gap-2 lg:col-span-3">
          <button className="btn btn-primary">Terapkan</button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setDraft(EMPTY);
              setFilters(EMPTY);
              setPage(1);
            }}
          >
            Reset
          </button>
        </div>
      </form>

      {list.error && (
        <p role="alert" className="card text-sm text-expense">{list.error}</p>
      )}

      <div className={`card overflow-x-auto !p-0 ${list.loading ? "opacity-60" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Tanggal</th>
              <th className="px-4 py-2 font-medium">Keterangan</th>
              <th className="px-4 py-2 font-medium">Dompet</th>
              <th className="px-4 py-2 text-right font-medium">Jumlah</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && !list.loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">Tidak ada transaksi.</td>
              </tr>
            )}
            {rows.map((tx) => (
              <ExpenseRow
                key={tx.id}
                tx={tx}
                open={expanded === tx.id}
                onToggle={() => setExpanded(expanded === tx.id ? null : tx.id)}
                onEdit={() => setEditing(tx)}
                onDelete={() => setDeleting(tx)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button className="btn" disabled={page <= 1 || list.loading} onClick={() => setPage(page - 1)}>← Sebelumnya</button>
        <span className="text-muted">Halaman {page}</span>
        <button className="btn" disabled={!list.data?.hasMore || list.loading} onClick={() => setPage(page + 1)}>Berikutnya →</button>
      </div>

      {editing && (
        <ExpenseFormModal
          accountId={account.id}
          expense={editing === "new" ? null : editing}
          categories={cats.data ?? []}
          wallets={wallets.data?.wallets ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
            cats.reload();
            wallets.reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Hapus transaksi"
          message={`Hapus transaksi #${deleting.id} (${deleting.description || deleting.category}, ${formatMoney(deleting.amount, deleting.currency)})? Tindakan ini tidak bisa dibatalkan.`}
          confirmLabel="Hapus"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api(`${base}/expenses/${deleting.id}`, { method: "DELETE" });
            setDeleting(null);
            list.reload();
            wallets.reload();
          }}
        />
      )}
    </div>
  );
}

function ExpenseRow({
  tx,
  open,
  onToggle,
  onEdit,
  onDelete,
}: {
  tx: Expense;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasItems = (tx.items?.length ?? 0) > 0;
  return (
    <>
      <tr>
        <td className="px-4 py-2 whitespace-nowrap text-muted">{formatDateTime(tx.transactionDate)}</td>
        <td className="px-4 py-2">
          <p className="font-medium">{tx.description || tx.category}</p>
          <p className="text-xs text-muted">
            {tx.category} · #{tx.id} · @{tx.username}
            {hasItems && (
              <>
                {" · "}
                <button
                  type="button"
                  className="text-brand hover:underline"
                  onClick={onToggle}
                  aria-expanded={open}
                >
                  {open ? "Sembunyikan item" : `${tx.items!.length} item`}
                </button>
              </>
            )}
          </p>
        </td>
        <td className="px-4 py-2 whitespace-nowrap text-muted">{tx.walletName ?? "—"}</td>
        <td className={`px-4 py-2 text-right font-medium whitespace-nowrap ${tx.type === "income" ? "text-income" : "text-expense"}`}>
          {tx.type === "income" ? "+" : "−"}
          {formatMoney(tx.amount, tx.currency)}
        </td>
        <td className="px-4 py-2 text-right whitespace-nowrap">
          <button className="btn !px-2 !py-1" onClick={onEdit}>Ubah</button>{" "}
          <button className="btn !px-2 !py-1" onClick={onDelete}>Hapus</button>
        </td>
      </tr>
      {open && hasItems && (
        <tr>
          <td />
          <td colSpan={4} className="px-4 pb-3">
            <ul className="space-y-1 text-xs text-muted">
              {tx.items!.map((it) => (
                <li key={it.id} className="flex justify-between gap-4">
                  <span>
                    {it.itemName} × {it.quantity} <span className="opacity-70">({it.category})</span>
                  </span>
                  <span>{it.totalPrice != null ? formatMoney(it.totalPrice, tx.currency) : "—"}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-2 text-xs font-medium text-brand hover:underline"
              onClick={onEdit}
            >
              ✎ Ubah rincian item
            </button>
          </td>
        </tr>
      )}
    </>
  );
}
