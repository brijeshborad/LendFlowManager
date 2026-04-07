# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LendFlowManager is a full-stack lending management web application for tracking loans, borrowers, payments, interest calculations, cash flow, and automated reminders. **This is NOT a Next.js project** — it is a React SPA (Vite) + Express API monorepo. Ignore any Next.js or "use client" suggestions from tooling.

## Commands

- **Dev server:** `npm run dev` (starts Express + Vite on port 5001)
- **Build:** `npm run build` (Vite frontend build + esbuild server bundle)
- **Type check:** `npm run check` (tsc --noEmit) — note: pre-existing errors exist in Reports.tsx, reminderService.ts, replitAuth.ts
- **Push schema to DB:** `npm run db:push` (drizzle-kit push)
- **Production:** `npm start` (runs `dist/index.js`)

## Architecture

### Monorepo Structure (single package.json)

```
client/          → React SPA (Vite + TypeScript)
server/          → Express API + WebSocket server
shared/          → Drizzle schema + Zod validation (shared between client/server)
```

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

### Dev Server Flow
In development, Express starts on port 5001 and Vite runs in **middleware mode** (`server/vite.ts`). Express API routes (`/api/*`) are registered first, then Vite middleware catches all remaining paths for HMR and SPA routing. In production, `dist/public` is served via Express static middleware with SPA fallback.

### Frontend
- **React 18** with **wouter** for routing (not react-router)
- **TanStack Query v5** for data fetching/caching (`client/src/lib/queryClient.ts`)
- **shadcn/ui** components in `client/src/components/ui/`
- **Tailwind CSS** with dark mode via `ThemeProvider`
- **Recharts** for data visualization
- Auth state via `useAuth` hook (`client/src/hooks/useAuth.ts`) — calls `/api/auth/user`
- All monetary values displayed with monospace font (JetBrains Mono)
- PDF generation via `jsPDF` + `jspdf-autotable` in `client/src/lib/generateStatementPdf.ts`

### Backend
- **Express.js** with session-based auth (passport-local + bcrypt)
- **PostgreSQL** via `postgres` driver + **Drizzle ORM** (`server/db.ts`)
- All routes in `server/routes.ts`, protected by `isAuthenticated` middleware from `server/localAuth.ts`
- **WebSocket** server for real-time updates (ws package), tracks clients per user
- Storage layer: `server/storage.ts` (IStorage interface → DatabaseStorage implementation) — all operations scoped by userId
- File uploads via multer to `uploads/` directory

### Database
- Schema defined in `shared/schema.ts` using Drizzle ORM pg-core
- Tables: users, borrowers, loans, payments, interest_entries, reminders, email_logs, email_templates, audit_logs, sessions, fund_holders, cash_transactions
- All entities scoped to userId for data isolation
- Insert schemas generated via `createInsertSchema` from drizzle-zod
- Migrations output to `./migrations/`, but `db:push` is used for dev

### Key Patterns
- All monetary values use `decimal(15, 2)` in the schema
- Entity IDs are UUIDs (text with `gen_random_uuid()`)
- API routes follow REST: `/api/{resource}` with userId filtering
- Zod schemas from `shared/schema.ts` used for both client-side form validation and server-side request validation
- Indian currency formatting: `toLocaleString('en-IN')` with `₹` prefix
- Date display uses ordinal suffix format: "15th Jan, 2024"

## Interest Calculation

The interest engine (`server/interestCalculationService.ts`) uses a **30-day standardized month**:

- Monthly rate: `principal × (rate/100) × (days/30)`
- Annual rate: `principal × (rate/100/12) × (days/30)`
- **Principal payments reduce the balance mid-month** — interest is split into before/after periods
- `calculateRealTimeInterestForUser()` batch-loads all payments in one query to avoid N+1
- `generateHistoricalInterestEntries()` backfills interest entries for loans with past start dates
- The same calculation logic is duplicated in `storage.ts` methods `generateBorrowerReport()` and `calculatePendingInterest()` for report generation

## Cash Tracking System

Optional feature toggled per user via `cashTrackingEnabled` setting:

- **Fund Holders**: Partners who hold cash (simple name entities)
- **Cash Transactions**: Tracks inflows, outflows, loan disbursements, payment collections, and transfers between fund holders
- Transfers use a `transferGroupId` to link paired transfer_out/transfer_in records
- Loan disbursements link to loans; payment collections link to payments
- Balances computed on-the-fly: sum(inflows) - sum(outflows) per fund holder

## Environment Variables
- `DATABASE_URL` (required) — PostgreSQL connection string
- `PORT` — Server port (default: 5001)
- `SESSION_SECRET` — Express session secret
- `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM_ADDRESS` — Optional email config (mock mode if unset)
