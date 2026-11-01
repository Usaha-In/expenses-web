"use client";

import { useEffect, useState } from "react";
import { ApiError, api, setCsrfToken } from "@/lib/api";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [csrfReady, setCsrfReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ csrfToken: string }>("auth/csrf")
      .then((res) => {
        if (cancelled) return;
        setCsrfToken(res.csrfToken);
        setCsrfReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Gagal menyiapkan sesi keamanan. Muat ulang halaman.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("auth/login", { method: "POST", body: { code } });
      // Full navigation so the new session cookie is used and no stale state remains.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal masuk.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <form onSubmit={submit} className="card space-y-4">
        <div>
          <h1 className="text-xl font-semibold">💸 Masuk ke Expenses</h1>
          <p className="mt-1 text-sm text-muted">
            Kirim{" "}
            <code className="rounded bg-black/10 px-1 dark:bg-white/10">
              /weblogin
            </code>{" "}
            ke bot Telegram lewat chat pribadi, lalu masukkan kode yang
            diberikan.
          </p>
        </div>
        <div>
          <label htmlFor="code" className="label">
            Kode login
          </label>
          <input
            id="code"
            className="input text-center font-mono text-lg tracking-widest uppercase"
            placeholder="ABCD-EFGH"
            autoComplete="one-time-code"
            autoFocus
            maxLength={12}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}
        <button
          className="btn btn-primary w-full"
          disabled={busy || !csrfReady || code.trim().length < 8}
        >
          {busy ? "Memeriksa…" : "Masuk"}
        </button>
      </form>
    </main>
  );
}
