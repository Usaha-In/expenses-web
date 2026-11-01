"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionProvider, useSession } from "./session";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transaksi" },
  { href: "/wallets", label: "Dompet" },
];

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, account, setAccountId, logout } = useSession();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16">
      <header className="flex flex-wrap items-center gap-3 py-4">
        <span className="text-lg font-semibold">💸 Expenses</span>
        <nav className="flex gap-1" aria-label="Navigasi utama">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  active ? "bg-brand text-white dark:text-black" : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {session.accounts.length > 1 ? (
            <select
              aria-label="Pilih akun"
              className="input !w-auto"
              value={account.id}
              onChange={(e) => setAccountId(Number(e.target.value))}
            >
              {session.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.kind === "group" ? "👥" : "👤"} {a.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-muted">{account.label}</span>
          )}
          <button className="btn" onClick={() => void logout()}>
            Keluar
          </button>
        </div>
      </header>
      {/* key forces page state to reset when switching accounts */}
      <main key={account.id} className="flex-1">
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}
