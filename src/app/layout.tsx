import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Expenses",
  description: "Dashboard pengeluaran & pemasukan",
  robots: { index: false, follow: false },
};

// Nonce-based CSP (see proxy.ts) requires every page to be rendered per request.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
