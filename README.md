# Expenses Web Dashboard (Next.js App Router + BFF)

Web dashboard for the Telegram AI Expense Tracker (`../expenses`), built with **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS v4**.

## Features

- **Telegram One-Time Login (`/weblogin`)**: Send `/weblogin` to the Telegram bot in a private chat to receive a short-lived, single-use login code (`ABCD-EFGH`).
- **Personal & Shared Group Ledgers**: Switch seamlessly between your personal Telegram ledger and any whitelisted Telegram group ledger you belong to.
- **Dashboard (`/`)**: Daily, weekly, and monthly summaries, period navigation, daily income/expense bar chart, and top category breakdown.
- **Transactions (`/transactions`)**: Paginated list with search, type, category, wallet, and date-range filters; create, edit, and delete transactions; expand receipt line items.
- **Wallets (`/wallets`)**: View balances per wallet, create wallets, switch the main wallet, and delete non-main wallets.
- **Backend-for-Frontend (BFF) Security**:
  - Opaque session tokens live exclusively in `HttpOnly`, `SameSite=Lax` cookies (`__Host-expen_session` over HTTPS in production).
  - Pre-login and in-session CSRF protection (`X-CSRF-Token` + `Origin` verification).
  - Per-request nonce-based `Content-Security-Policy` via `src/proxy.ts`.

## Quick Start

1. Start PostgreSQL and the NestJS backend (`../expenses`):
   ```bash
   cd ../expenses
   npm run db:up
   npm run start:dev
   ```
   By default the backend REST API listens on `http://127.0.0.1:3001/api/v1`.

2. Configure and start the Next.js web app:
   ```bash
   cd ../web
   cp -n .env.example .env.local
   npm run dev
   ```
   Open `http://127.0.0.1:3000` (or `http://localhost:3000`), send `/weblogin` to your Telegram bot in a private chat, and enter the 8-character code.

## Production Build

```bash
npm run lint
npm run build
npm run start
```
