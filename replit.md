# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: Oracle DB 19c (`192.168.1.30:1521/ORCLPDB1`, user `JD2`) via `oracledb` — private LAN only
- **Auth**: Phone + Password + 6-digit OTP (2-step), JWT tokens via `jsonwebtoken`, passwords via `bcryptjs`
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: Milk Bill Reporting System

### Artifacts
1. **API Server** (`artifacts/api-server`) — Express API on port 8080
2. **Milk Bill Dashboard** (`artifacts/milk-bill-dashboard`) — React/Vite web app at `/`

### Design System
- Primary blue: `#0B5FA5` (hsl 207 88% 35%)
- Background: `#F5F7FA` (hsl 216 33% 97%)
- Green accent: `#4CAF50` (hsl 122 39% 49%)
- Error red: `#E53935` (hsl 2 76% 55%)
- Radius: 8px, No gradients, no emojis, Indian Rupee (₹) formatting, Liters (L) for quantities

### Pages Built
**Milk Bill section:**
- `/` — Dashboard with KPI cards and recent bills table
- `/bills` — Bills list with filter, paginated table, delete dialog
- `/bills/new` — Create bill form (collapsible bank details section)
- `/bills/:id` — Bill detail with grouped milk entries, deductions, sticky footer (Final Payable)
- `/bank-advice` — Bank advice table with summary cards
- `/reports` — Monthly/Yearly reports with Recharts bar chart

**Central Input section:**
- `/central-input/purchases` — Purchase records with add dialog
- `/central-input/performance` — Society performance vs. targets (card view with progress bars)
- `/central-input/targets` — Target setting with progress bar column
- `/central-input/dcs-monitoring` — Quality test monitoring with pass/fail badges

### DB Schema (Oracle — raw SQL, no ORM)
Business tables: `BILLS`, `SOCIETIES`, `ROUTES`, `MILK_ENTRIES`, `DEDUCTIONS`, `PURCHASES`, `TARGETS`, `DCS_RECORDS` (discovered dynamically via `USER_TABLES` in `oracle.ts`)
Auth table: `APP_USERS` (auto-created on startup) — columns: ID, PHONE, PASSWORD_HASH, IS_ACTIVE, CREATED_AT

**Adding users:** Run `artifacts/api-server/scripts/setup-auth.sql` in SQL Developer / SQL*Plus.
Generate bcrypt hash: `node -e "require('bcryptjs').hash('YourPwd',12).then(h=>console.log(h))"`

### API Routes
All routes prefixed with `/api`:
- `POST /api/auth/login` — validate phone+password, generate OTP (logged to console), return success
- `POST /api/auth/verify-otp` — verify 6-digit OTP, return JWT token (8h expiry)
- `POST /api/auth/resend-otp` — regenerate and log a fresh OTP
- `GET /api/auth/me` — (protected) returns phone+userId from JWT
- `GET /api/healthz`
- `GET /api/dashboard/summary`, `GET /api/dashboard/recent-bills`
- `GET/POST /api/bills`, `GET/PUT/DELETE /api/bills/:id`
- `GET /api/bills/:id/entries`, `GET /api/bills/:id/deductions`
- `GET /api/societies`, `GET /api/routes`
- `GET /api/bank-advice`
- `GET /api/reports/monthly`, `GET /api/reports/yearly`
- `GET/POST /api/purchases`, `GET/POST /api/targets`
- `GET /api/dcs-monitoring`

### Helper Utilities (`src/lib/utils.ts`)
`formatCurrency`, `formatQuantity`, `formatDate`, `formatPercent`, `getStatusColor`, `MONTH_NAMES`, `cn`

### Important Notes
- `@workspace/api-client-react` is imported everywhere (never relative paths)
- Zod index.ts uses explicit non-conflicting type exports to avoid codegen conflicts
- Bill detail sticky footer: `fixed bottom-0 left-64 right-0` (sidebar is `w-64`)
- DCS badge colors: pass=default(blue), fail=destructive(red)
