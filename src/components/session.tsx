"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, api, setCsrfToken } from "@/lib/api";
import type { SessionInfo, WebAccount } from "@/lib/types";

interface SessionContextValue {
  session: SessionInfo;
  account: WebAccount;
  setAccountId: (id: number) => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const ACCOUNT_PREF_KEY = "expen.account"; // non-sensitive UI preference only

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [accountId, setAccountIdState] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goToLogin = useCallback(() => {
    setCsrfToken(null);
    setSession(null);
    setAccountIdState(null);
    try {
      window.localStorage.removeItem(ACCOUNT_PREF_KEY);
    } catch {
      // storage unavailable
    }
    // Full navigation clears all client-side state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<SessionInfo>("auth/me")
      .then((info) => {
        if (cancelled) return;
        setCsrfToken(info.csrfToken);
        setSession(info);
        const saved = Number(window.localStorage.getItem(ACCOUNT_PREF_KEY));
        const chosen = info.accounts.find((a) => a.id === saved) ?? info.accounts[0];
        setAccountIdState(chosen?.id ?? null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) goToLogin();
        else setError(e instanceof ApiError ? e.message : "Gagal memuat sesi.");
      });

    const onExpired = () => goToLogin();
    window.addEventListener("expen:session-expired", onExpired);
    return () => {
      cancelled = true;
      window.removeEventListener("expen:session-expired", onExpired);
    };
  }, [goToLogin]);

  const setAccountId = useCallback((id: number) => {
    window.localStorage.setItem(ACCOUNT_PREF_KEY, String(id));
    setAccountIdState(id);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("auth/logout", { method: "POST" });
    } catch {
      // cookie is cleared server-side regardless; continue to the login page
    }
    goToLogin();
  }, [goToLogin]);

  const value = useMemo<SessionContextValue | null>(() => {
    if (!session || accountId === null) return null;
    const account = session.accounts.find((a) => a.id === accountId);
    if (!account) return null;
    return { session, account, setAccountId, logout };
  }, [session, accountId, setAccountId, logout]);

  if (error) {
    return (
      <div className="mx-auto mt-24 max-w-md card text-center">
        <p className="text-sm text-expense">{error}</p>
        <button className="btn mt-4" onClick={() => window.location.reload()}>
          Muat ulang
        </button>
      </div>
    );
  }
  if (!value) {
    return <p className="mt-24 text-center text-sm text-muted">Memuat…</p>;
  }
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
