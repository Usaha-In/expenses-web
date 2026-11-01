"use client";

import { useRef, useState } from "react";
import { Modal } from "./modal";
import { ApiError, api } from "@/lib/api";
import { formatMoney, toDateInput } from "@/lib/format";
import type {
  CategoryUsage,
  Expense,
  ExpenseItem,
  TransactionType,
  Wallet,
} from "@/lib/types";

interface DraftItem {
  key: number;
  itemName: string;
  quantity: string;
  unitPrice: string;
  category: string;
}

function toDraftItems(items?: ExpenseItem[]): DraftItem[] {
  return (items ?? []).map((it, idx) => {
    const qty = Number(it.quantity) > 0 ? Number(it.quantity) : 1;
    const unit =
      it.unitPrice != null
        ? Number(it.unitPrice)
        : it.totalPrice != null
          ? Math.round((Number(it.totalPrice) / qty) * 100) / 100
          : 0;
    return {
      key: idx + 1,
      itemName: it.itemName,
      quantity: String(qty),
      unitPrice: String(unit),
      category: it.category || "",
    };
  });
}

function calcRowSubtotal(item: DraftItem): number {
  const qty = Number(item.quantity);
  const price = Number(item.unitPrice);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) {
    return 0;
  }
  return Math.round(qty * price * 100) / 100;
}

function sumDraftItems(list: DraftItem[]): number {
  return Math.round(list.reduce((acc, it) => acc + calcRowSubtotal(it), 0) * 100) / 100;
}

export function ExpenseFormModal({
  accountId,
  expense,
  categories,
  wallets,
  onClose,
  onSaved,
}: {
  accountId: number;
  expense: Expense | null;
  categories: CategoryUsage[];
  wallets: Wallet[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialDate = expense
    ? toDateInput(new Date(expense.transactionDate))
    : toDateInput(new Date());
  const mainWallet = wallets.find((w) => w.isMain)?.name ?? "";
  const currency = expense?.currency ?? "IDR";

  const [type, setType] = useState<TransactionType>(expense?.type ?? "expense");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [category, setCategory] = useState(expense?.category ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [wallet, setWallet] = useState(expense?.walletName ?? mainWallet);
  const [date, setDate] = useState(initialDate);
  const [items, setItems] = useState<DraftItem[]>(() =>
    toDraftItems(expense?.items),
  );
  const nextKey = useRef((expense?.items?.length ?? 0) + 1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const itemsTotal = sumDraftItems(items);
  const parsedAmount = Number(amount);

  function updateItemsAndSyncAmount(updater: (prev: DraftItem[]) => DraftItem[]) {
    setItems((prev) => {
      const prevSum = sumDraftItems(prev);
      const next = updater(prev);
      const nextSum = sumDraftItems(next);
      setAmount((curAmount) => {
        const curNum = Number(curAmount);
        // Auto-sync parent amount if empty or previously equal to the items sum
        if (next.length > 0 && nextSum > 0 && (curAmount.trim() === "" || curNum === prevSum)) {
          return String(nextSum);
        }
        return curAmount;
      });
      return next;
    });
  }

  function addItemRow() {
    const key = nextKey.current++;
    updateItemsAndSyncAmount((prev) => [
      ...prev,
      {
        key,
        itemName: "",
        quantity: "1",
        unitPrice: "",
        category: category.trim(),
      },
    ]);
  }

  function patchItemRow(key: number, patch: Partial<DraftItem>) {
    updateItemsAndSyncAmount((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...patch } : it)),
    );
  }

  function removeItemRow(key: number) {
    updateItemsAndSyncAmount((prev) => prev.filter((it) => it.key !== key));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Jumlah harus lebih dari 0.");
      return;
    }
    if (!category.trim()) {
      setError("Kategori wajib diisi.");
      return;
    }

    const payloadItems: Array<{
      itemName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      category: string;
    }> = [];

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const name = row.itemName.trim();
      const qty = Number(row.quantity);
      const unitPrice = Number(row.unitPrice);

      if (!name) {
        setError(`Nama rincian item ke-${i + 1} wajib diisi.`);
        return;
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        setError(`Qty untuk "${name}" harus lebih dari 0.`);
        return;
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        setError(`Harga untuk "${name}" tidak valid.`);
        return;
      }
      payloadItems.push({
        itemName: name,
        quantity: Math.round(qty * 100) / 100,
        unitPrice: Math.round(unitPrice * 100) / 100,
        totalPrice: Math.round(qty * unitPrice * 100) / 100,
        category: row.category.trim() || category.trim(),
      });
    }

    setBusy(true);
    setError(null);
    try {
      if (expense) {
        const patch: Record<string, unknown> = {};
        if (value !== expense.amount) patch.amount = value;
        if (type !== expense.type) patch.type = type;
        if (category.trim() !== expense.category) patch.category = category.trim();
        if (description.trim() !== expense.description) {
          patch.description = description.trim();
        }
        if (wallet && wallet !== expense.walletName) patch.wallet = wallet;
        if (date !== initialDate) patch.transactionDate = date;

        const originalNormalized = (expense.items ?? []).map((it) => {
          const qty = Number(it.quantity) > 0 ? Math.round(Number(it.quantity) * 100) / 100 : 1;
          const unit =
            it.unitPrice != null
              ? Math.round(Number(it.unitPrice) * 100) / 100
              : it.totalPrice != null
                ? Math.round((Number(it.totalPrice) / qty) * 100) / 100
                : 0;
          return {
            itemName: it.itemName.trim(),
            quantity: qty,
            unitPrice: unit,
            totalPrice:
              it.totalPrice != null
                ? Math.round(Number(it.totalPrice) * 100) / 100
                : Math.round(qty * unit * 100) / 100,
            category: (it.category || expense.category).trim(),
          };
        });

        if (JSON.stringify(payloadItems) !== JSON.stringify(originalNormalized)) {
          patch.items = payloadItems;
        }

        if (Object.keys(patch).length === 0) {
          onClose();
          return;
        }
        await api(`accounts/${accountId}/expenses/${expense.id}`, {
          method: "PATCH",
          body: patch,
        });
      } else {
        await api(`accounts/${accountId}/expenses`, {
          method: "POST",
          body: {
            type,
            amount: value,
            category: category.trim(),
            description: description.trim() || undefined,
            wallet: wallet || undefined,
            transactionDate: date,
            ...(payloadItems.length > 0 ? { items: payloadItems } : {}),
          },
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan.");
      setBusy(false);
    }
  }

  return (
    <Modal
      title={expense ? `Ubah transaksi #${expense.id}` : "Tambah transaksi"}
      wide
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <div
          className="grid grid-cols-2 gap-1 rounded-lg border border-border p-0.5"
          role="radiogroup"
          aria-label="Jenis"
        >
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => setType(t)}
              className={`rounded-md py-1.5 text-sm font-medium ${
                type === t
                  ? t === "expense"
                    ? "bg-expense text-white dark:text-black"
                    : "bg-income text-white dark:text-black"
                  : "text-muted"
              }`}
            >
              {t === "expense" ? "Pengeluaran" : "Pemasukan"}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="amount">
              Jumlah total
            </label>
            <input
              id="amount"
              className="input"
              inputMode="decimal"
              type="number"
              min="0"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="category">
              Kategori utama
            </label>
            <input
              id="category"
              className="input"
              list="category-options"
              maxLength={100}
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <datalist id="category-options">
              {categories.map((c) => (
                <option key={c.category} value={c.category} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="description">
            Deskripsi
          </label>
          <input
            id="description"
            className="input"
            maxLength={4000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="wallet">
              Dompet
            </label>
            <select
              id="wallet"
              className="input"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
            >
              {wallets.length === 0 && <option value="">Main</option>}
              {wallets.map((w) => (
                <option key={w.id} value={w.name}>
                  {w.name}
                  {w.isMain ? " ⭐" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="date">
              Tanggal
            </label>
            <input
              id="date"
              type="date"
              className="input"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Detail items editor */}
        <div className="rounded-lg border border-border p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Rincian item ({items.length})
            </span>
            <button
              type="button"
              className="btn !px-2.5 !py-1 text-xs"
              onClick={addItemRow}
            >
              + Tambah item
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-xs text-muted">
              Belum ada rincian item. Klik <strong>+ Tambah item</strong> jika
              transaksi ini memiliki beberapa item detail (mis. struk belanja).
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((row, idx) => {
                const sub = calcRowSubtotal(row);
                return (
                  <div
                    key={row.key}
                    className="rounded-lg border border-border bg-background/60 p-2.5 space-y-2"
                  >
                    <div className="grid gap-2 sm:grid-cols-12 items-end">
                      <div className="sm:col-span-5">
                        <label
                          className="label"
                          htmlFor={`it-name-${row.key}`}
                        >
                          Nama item #{idx + 1}
                        </label>
                        <input
                          id={`it-name-${row.key}`}
                          className="input"
                          placeholder="mis. Es Kopi Susu 1L"
                          maxLength={255}
                          required
                          value={row.itemName}
                          onChange={(e) =>
                            patchItemRow(row.key, { itemName: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:col-span-4">
                        <div>
                          <label
                            className="label"
                            htmlFor={`it-qty-${row.key}`}
                          >
                            Qty
                          </label>
                          <input
                            id={`it-qty-${row.key}`}
                            className="input"
                            type="number"
                            min="0.01"
                            step="any"
                            required
                            value={row.quantity}
                            onChange={(e) =>
                              patchItemRow(row.key, {
                                quantity: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label
                            className="label"
                            htmlFor={`it-price-${row.key}`}
                          >
                            Harga satuan
                          </label>
                          <input
                            id={`it-price-${row.key}`}
                            className="input"
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={row.unitPrice}
                            onChange={(e) =>
                              patchItemRow(row.key, {
                                unitPrice: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-3">
                        <label
                          className="label"
                          htmlFor={`it-cat-${row.key}`}
                        >
                          Kategori item
                        </label>
                        <input
                          id={`it-cat-${row.key}`}
                          className="input"
                          list="category-options"
                          maxLength={100}
                          placeholder={category.trim() || "Kategori"}
                          value={row.category}
                          onChange={(e) =>
                            patchItemRow(row.key, { category: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>Subtotal: {formatMoney(sub, currency)}</span>
                      <button
                        type="button"
                        className="text-expense hover:underline"
                        onClick={() => removeItemRow(row.key)}
                      >
                        Hapus item
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <span className="font-medium">
                  Total rincian item: {formatMoney(itemsTotal, currency)}
                </span>
                {itemsTotal > 0 && parsedAmount !== itemsTotal && (
                  <button
                    type="button"
                    className="text-brand hover:underline"
                    onClick={() => setAmount(String(itemsTotal))}
                  >
                    Samakan jumlah total ke {formatMoney(itemsTotal, currency)}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal.");
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm">{message}</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-expense">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>
          Batal
        </button>
        <button
          className="btn btn-danger"
          onClick={() => void run()}
          disabled={busy}
        >
          {busy ? "Memproses…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
