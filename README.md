# Technosoft ERP

A modern web rebuild of **Technosoft**, an accounts and inventory system written in Visual FoxPro and used for years by a garments company in Bangladesh. The original works on one PC. This version runs in the browser, keeps the same accounting rules, and stores data in SQL Server using the **same table and column names** as the FoxPro system, so the old records can be imported later.

> Status: in progress. Login, Chart of Accounts and Voucher entry are working. Journal, Reports, Projects and Inventory are next.

---

## Features so far

| Area | What it does |
|---|---|
| **Landing page** | Public home page introducing the system, with a Sign in button |
| **Login** | Username + password (bcrypt), signed JWT token for 8 hours, working year (Bangladesh fiscal year, July–June) chosen at sign-in |
| **App layout** | Sidebar with the old menu structure (Accounts, Projects, Inventory, System), live clock, working-year badge, sign out |
| **Chart of Accounts** | Groups → Sub groups → Ledgers in one tree. Type a code to open it, nature rules (Assets / Liability / Income / Expense), "Exist into" statement, ledger type (Cash, Bank, Store, Party, None, Project). Saving a Project ledger automatically creates a project job |
| **Voucher entry** | Cash Payment (CP), Cash Received (CR), Cheque Payment (BP), Cheque Received (BR). Auto voucher numbers, type a number to reopen and edit, searchable account picker, project per line, total, saved in one transaction |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router · TanStack Query · Axios · lucide-react |
| Backend | NestJS 12 (ES modules) · TypeScript · class-validator · JWT · bcrypt |
| Database | Microsoft SQL Server 2025 Express · Prisma 7 ORM (`@prisma/adapter-mssql`) |

### Backend architecture

Every feature module follows the same four layers:

```
Controller   (presentation)  → receives the HTTP request, no rules
Service      (business)      → all accounting rules and validation
Repository   (persistence)   → database queries only
PrismaService (database)     → single connection to SQL Server
```

---

## Project structure

```
technosoft-erp/
├── client/                          React frontend
│   └── src/
│       ├── features/
│       │   ├── landing/pages/       LandingPage.tsx
│       │   ├── auth/                LoginPage, useLogin, auth.api
│       │   ├── accounts/            ChartOfAccountsPage, useChart, chart.api
│       │   └── vouchers/            VoucherPage, useVouchers, vouchers.api
│       ├── layouts/MainLayout.tsx   sidebar + top bar
│       ├── routes/ProtectedRoute.tsx
│       ├── lib/axios.ts             API client, token, 401 handling
│       └── main.tsx                 routes
│
└── server/                          NestJS backend
    ├── prisma/
    │   ├── schema.prisma            tables (mapped to FoxPro names)
    │   ├── seed.ts                  admin user + sample chart of accounts
    │   └── setup-database.sql       creates the database and app login
    ├── prisma.config.ts
    └── src/
        ├── main.ts / app.module.ts
        ├── prisma/                  PrismaService
        ├── common/                  JWT guard, @Public(), @CurrentUser()
        └── modules/
            ├── auth/                login, token
            ├── users/
            ├── accounts/            chart of accounts (lcodes, jprofile)
            └── vouchers/            voucher entry (trction)
```

---

## Getting started

### 1. Requirements

- **Node.js 22** or newer
- **SQL Server 2025 Express** (or any SQL Server) and **SSMS**

### 2. Prepare SQL Server (one time)

1. In SSMS, run `server/prisma/setup-database.sql`. It creates the `technosoft` database and the `technosoft_app` login.
2. Server **Properties → Security** → choose **SQL Server and Windows Authentication mode**.
3. **SQL Server Configuration Manager** (`SQLServerManager17.msc` for SQL Server 2025):
   - SQL Server Network Configuration → Protocols for SQLEXPRESS → enable **TCP/IP**
   - TCP/IP → IP Addresses → **IPAll**: clear *TCP Dynamic Ports*, set *TCP Port* = `1433`
   - Restart the SQL Server service
4. Check: `Test-NetConnection localhost -Port 1433` should show `TcpTestSucceeded : True`.

### 3. Backend

```bash
cd server
copy .env.example .env          # then edit the values
npm install --legacy-peer-deps
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
npm run start:dev
```

API runs at **http://localhost:3000/api**.

`server/.env`:

```env
DATABASE_URL="sqlserver://localhost:1433;database=technosoft;user=technosoft_app;password=ChangeMe123!;encrypt=true;trustServerCertificate=true"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=3000
CLIENT_URL="http://localhost:5173"
```

### 4. Frontend

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173** and sign in with **admin / admin123** (created by the seed). Change this password before real use.

---

## Useful commands

| Command | Run in | What it does |
|---|---|---|
| `npm run dev` | client | Start the frontend with live reload |
| `npx tsc -b` | client | Type-check every frontend file |
| `npm run start:dev` | server | Start the backend with live reload |
| `npx prisma migrate dev --name <change>` | server | Apply changes in `schema.prisma` to the database |
| `npx prisma generate` | server | Refresh the TypeScript database client (run after every migrate) |
| `npx prisma db seed` | server | Add the admin user and sample accounts |
| `npx prisma studio` | server | Browse the tables in the browser |

> npm 10 can fail with `Cannot read properties of null (reading 'edgesOut')`. Add `--legacy-peer-deps` to the install command, or update npm with `npm install -g npm@latest`.

---

## API

All routes start with `/api`. Every route except login needs the header `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/login` | Sign in → token + user |
| GET | `/auth/me` | Who is signed in |
| GET | `/accounts/chart` | All groups, sub groups and ledgers |
| POST | `/accounts/chart` | Create an account (code optional, padded to 6 digits) |
| PUT | `/accounts/chart/:code` | Update an account |
| GET | `/vouchers/setup` | Ledgers and project jobs for the voucher screen |
| GET | `/vouchers/next-number?type=CP&bank=` | Next free voucher number |
| GET | `/vouchers/:voucherNo?bank=` | Open a voucher for editing |
| POST | `/vouchers` | Save a new voucher |
| PUT | `/vouchers/:voucherNo` | Update a voucher |

---

## Database

Tables and columns keep the FoxPro names; the code uses readable names through Prisma `@map`.

| Table | Was in FoxPro | Holds |
|---|---|---|
| `lcodes` | `LCODES.DBF` | Chart of accounts: groups, sub groups and ledgers in one tree (`undergrp` = parent code) |
| `jprofile` | `JPROFILE.DBF` | Project jobs, linked to a Project-type ledger (`acccode`) |
| `trction` | `TRCTION.DBF` | Voucher lines: each row is one debit + one credit of the same amount |
| `users` | (new) | Login users |

### Number codes (same as FoxPro)

| Column | Values |
|---|---|
| `ledlabel` | 1 Group · 2 Sub group · 3 Ledger |
| `lednat` | 1 Assets · 2 Liability · 3 Income · 4 Expense |
| `tmpa` | 0 None · 1 Trading · 2 Manufacturing · 3 Profit/Loss · 4 P/L Appropriation |
| `codesign` | 1 Cash · 2 Bank · 3 Store · 4 Party · 5 None · 6 Project |
| `vtype` | 1 Cash Payment · 2 Cash Received · 4 Cheque Payment · 5 Cheque Received |

### Key accounting rules

- A sub group sits under a group, a ledger under a sub group. A ledger copies nature, statement and ledger type from its sub group.
- Assets and Liability never go into Trading / P&L. Income and Expense must, and cannot be Bank, Store or Party.
- Payments (CP, BP): each line is **debited**, the cash/bank account is **credited**. Receipts (CR, BR): the reverse.
- Voucher numbers restart each working year; cheque vouchers are numbered separately for each bank.
- Balances are calculated from `trction`, never stored.

---

## Roadmap

- [ ] Journal voucher (debit and credit lines that must balance)
- [ ] Reports: ledger, trial balance, profit & loss, balance sheet
- [ ] Projects: project details, Up Heads, Valuation
- [ ] Inventory: godowns, items, item properties
- [ ] System: users and roles, company profile
- [ ] Import the old FoxPro `.dbf` data into SQL Server

---

## Credits

Original Technosoft system designed and written in Visual FoxPro by my father. Rebuilt for the web by **Atika Amin** (United International University).
