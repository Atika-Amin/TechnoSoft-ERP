# Technosoft ERP
 
A modern web rebuild of **Technosoft**, an accounts and inventory system written in Visual FoxPro and used for years by a garments company in Bangladesh. The original works on one PC. This version runs in the browser, keeps the same accounting rules, and stores data in SQL Server using the **same table and column names** as the FoxPro system, so the old records can be imported later.
 
> Status: in progress. Accounts are complete end to end: Chart of Accounts, Vouchers, Journal and all main reports (books, ledgers, trial balance, Trading & P/L, balance sheet). Work has started on **Bangla voice entry**: a page that collects voice recordings to train a speech model. Projects and Inventory are next.
 
---
 
## Features so far
 
| Area | What it does |
|---|---|
| **Landing page** | Public home page introducing the system, with a Sign in button |
| **Login** | Username + password (bcrypt), signed JWT token for 8 hours, working year (Bangladesh fiscal year, July–June) chosen at sign-in |
| **App layout** | Sidebar with the old menu structure (Accounts, Projects, Inventory, System), live clock, working-year badge, sign out |
| **Chart of Accounts** | Groups → Sub groups → Ledgers in one tree. Type a code to open it, nature rules (Assets / Liability / Income / Expense), "Exist into" statement, ledger type (Cash, Bank, Store, Party, None, Project), opening balance. Saving a Project ledger automatically creates a project job |
| **Voucher entry** | Cash Payment (CP), Cash Received (CR), Cheque Payment (BP), Cheque Received (BR). Auto voucher numbers, type a number to reopen and edit, searchable account picker, project per line, total, saved in one transaction |
| **Journal voucher** | Debit and credit lines that must balance before saving (JR numbers, restart each day). Stored the same way as the old system: one side has a single account, each line on the other side becomes one row |
| **Reports** | Cash book, Bank book, Journal book, Ledger (running balance), Sub-group ledger, **Trial balance** (periodic or up to date), **Trading & Profit / Loss**, **Balance sheet** (detailed or short). Print and Excel (CSV) on every report, with an out-of-balance warning |
| **Settings** | Company name and address (the `profile` table), printed on every report |
| **Voice data collection** | Public page (`/record`) where anyone can record Bangla voucher sentences from a phone or laptop. Each recording is saved with the correct voucher as its label, to train a Bangla speech → voucher model |
 
---
 
## Tech stack
 
| Layer | Technology |
|---|---|
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router · TanStack Query · Axios · lucide-react · MediaRecorder API |
| Backend | NestJS 12 (ES modules) · TypeScript · class-validator · JWT · bcrypt · Multer (audio upload) |
| Database | Microsoft SQL Server 2025 Express · Prisma 7 ORM (`@prisma/adapter-mssql`) |
| Voice model (planned) | Whisper (speech → Bangla text) + a small open LLM (text → voucher JSON), fine-tuned on the collected data and run locally |
 
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
│   ├── vite.config.ts               HTTPS + /api proxy (for phones on the same Wi-Fi)
│   └── src/
│       ├── features/
│       │   ├── landing/pages/       LandingPage.tsx
│       │   ├── auth/                LoginPage, useLogin, auth.api
│       │   ├── accounts/            ChartOfAccountsPage, useChart, chart.api
│       │   ├── vouchers/            VoucherPage, JournalPage, useVouchers, vouchers.api
│       │   ├── reports/             ReportsPage, reports.api
│       │   ├── settings/            SettingsPage, company.api
│       │   └── dataset/             RecordPage (public voice recording), dataset.api
│       ├── layouts/MainLayout.tsx   sidebar + top bar
│       ├── routes/ProtectedRoute.tsx
│       ├── lib/axios.ts             API client, token, 401 handling
│       └── main.tsx                 routes
│
└── server/                          NestJS backend
    ├── prisma/
    │   ├── schema.prisma            tables (mapped to FoxPro names)
    │   ├── migrations/              history of database changes
    │   ├── seed.ts                  admin user, sample chart of accounts and entries
    │   └── setup-database.sql       creates the database and app login
    ├── prisma.config.ts
    ├── uploads/voice/               recorded audio (not in Git)
    └── src/
        ├── main.ts / app.module.ts
        ├── prisma/                  PrismaService
        ├── common/                  JWT guard, @Public(), @CurrentUser()
        └── modules/
            ├── auth/                login, token
            ├── users/
            ├── accounts/            chart of accounts (lcodes, jprofile)
            ├── vouchers/            vouchers + journal (trction)
            ├── reports/             books, ledgers, trial balance, P&L, balance sheet
            ├── company/             company profile (profile)
            └── dataset/             voice prompts, recording upload, export
```
 
---
 
## Getting started
 
### 1. Requirements
 
- **Node.js 22** or newer
- **SQL Server 2025 Express** (or any SQL Server) and **SSMS**
### 2. Prepare SQL Server (one time)
 
1. In SSMS, run `server/prisma/setup-database.sql`. It creates the `technosoft` database and the `technosoft_app` login. **Change the password in the script first.**
2. Server **Properties → Security** → choose **SQL Server and Windows Authentication mode**.
3. **SQL Server Configuration Manager** (`SQLServerManager17.msc` for SQL Server 2025):
   - SQL Server Network Configuration → Protocols for SQLEXPRESS → enable **TCP/IP**
   - TCP/IP → IP Addresses → **IPAll**: clear *TCP Dynamic Ports*, set *TCP Port* = `1433`
   - Restart the SQL Server service
4. Check: `Test-NetConnection localhost -Port 1433` should show `TcpTestSucceeded : True`.
Forgot the app login password? Connect in SSMS with Windows Authentication and run:
 
```sql
ALTER LOGIN technosoft_app WITH PASSWORD = 'YourNewPassword', CHECK_POLICY = OFF;
```
 
then put the same password in `server/.env`.
 
### 3. Backend
 
```bash
cd server
copy .env.example .env          # then edit the values
npm install --legacy-peer-deps
npx prisma migrate dev
npx prisma generate
npx prisma db seed
npm run start:dev
```
 
API runs at **http://localhost:3000/api**.
 
`server/.env`:
 
```env
DATABASE_URL="sqlserver://localhost:1433;database=technosoft;user=technosoft_app;password=YourPassword;encrypt=true;trustServerCertificate=true"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=3000
CLIENT_URL="https://localhost:5173"
VOICE_DIR="uploads/voice"
```
 
Don't use `;`, `=` or `{ }` in the database password: they break the connection string.
 
### 4. Frontend
 
```bash
cd client
npm install
npm run dev
```
 
`client/.env.local`:
 
```env
VITE_API_URL=/api
```
 
Open **https://localhost:5173** and sign in with **admin / admin123** (created by the seed). Change this password before real use. The browser warns about the certificate once because it is self-signed: choose **Advanced → Proceed**.
 
### 5. Record from a phone (optional)
 
The dev server uses HTTPS (browsers only allow the microphone on HTTPS) and forwards `/api` to the backend, so a phone on the same Wi-Fi can use the recording page:
 
1. Find the laptop's IP with `ipconfig` (e.g. `192.168.0.105`).
2. Allow Node.js through Windows Firewall on private networks.
3. On the phone open `https://192.168.0.105:5173/record`, accept the certificate warning and allow the microphone.
The laptop does all the work; the phone is only a browser.
 
---
 
## Useful commands
 
| Command | Run in | What it does |
|---|---|---|
| `npm run dev` | client | Start the frontend with live reload |
| `npx tsc -b` | client | Type-check every frontend file |
| `npm run start:dev` | server | Start the backend with live reload |
| `npx prisma migrate dev --name <change>` | server | Apply changes in `schema.prisma` to the database |
| `npx prisma generate` | server | Refresh the TypeScript database client (run after every migrate) |
| `npx prisma db seed` | server | Add the admin user, sample accounts and sample entries |
| `npx prisma studio` | server | Browse the tables in the browser |
 
> npm 10 can fail with `Cannot read properties of null (reading 'edgesOut')`. Add `--legacy-peer-deps` to the install command, or update npm with `npm install -g npm@latest`.
 
---
 
## API
 
All routes start with `/api`. Every route needs the header `Authorization: Bearer <token>`, except login and the two public recording routes.
 
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
| GET | `/vouchers/journal/next-number?date=` | Next journal number for that date |
| GET | `/vouchers/journal/:voucherNo?date=` | Open a journal |
| POST | `/vouchers/journal` | Save a new journal (debit must equal credit) |
| PUT | `/vouchers/journal/:voucherNo` | Update a journal |
| GET | `/reports/options` | Cash, bank, ledger and sub-group lists for the report filters |
| GET | `/reports/ledger?account=&from=&to=` | Ledger / cash book / bank book with running balance |
| GET | `/reports/sub-group?code=&from=&to=` | Every ledger of a sub group: opening, debit, credit, closing |
| GET | `/reports/journal-book?from=&to=` | All journals in the range |
| GET | `/reports/trial-balance?from=&to=` | Opening, period and closing balance of every ledger |
| GET | `/reports/profit-loss?from=&to=` | Trading, Profit & Loss and Appropriation |
| GET | `/reports/balance-sheet?date=` | Assets and liabilities on a date |
| GET | `/company` · PUT `/company` | Read / save the company profile |
| GET | `/dataset/prompt?mode=read\|scenario` | *(public)* A sentence or situation to record |
| POST | `/dataset/samples` | *(public)* Upload one recording (multipart: `audio` + speaker details) |
| GET | `/dataset/stats` | Number of recordings and speakers |
| GET | `/dataset/export` | All recordings as JSONL for training |
 
---
 
## Database
 
Tables and columns keep the FoxPro names; the code uses readable names through Prisma `@map`.
 
| Table | Was in FoxPro | Holds |
|---|---|---|
| `lcodes` | `LCODES.DBF` | Chart of accounts: groups, sub groups and ledgers in one tree (`undergrp` = parent code) |
| `jprofile` | `JPROFILE.DBF` | Project jobs, linked to a Project-type ledger (`acccode`) |
| `trction` | `TRCTION.DBF` | Voucher and journal lines: each row is one debit + one credit of the same amount |
| `profile` | `PROFILE.DBF` | Company name, address and fiscal year |
| `users` | (new) | Login users |
| `voice_samples` | (new) | Voice recordings for training: speaker details, prompt, correct voucher (JSON), audio file name |
 
### Number codes (same as FoxPro)
 
| Column | Values |
|---|---|
| `ledlabel` | 1 Group · 2 Sub group · 3 Ledger |
| `lednat` | 1 Assets · 2 Liability · 3 Income · 4 Expense |
| `tmpa` | 0 None · 1 Trading · 2 Manufacturing · 3 Profit/Loss · 4 P/L Appropriation |
| `codesign` | 1 Cash · 2 Bank · 3 Store · 4 Party · 5 None · 6 Project |
| `vtype` | 1 Cash Payment · 2 Cash Received · 4 Cheque Payment · 5 Cheque Received · 6 Journal |
 
### Key accounting rules
 
- A sub group sits under a group, a ledger under a sub group. A ledger copies nature, statement and ledger type from its sub group.
- Assets and Liability never go into Trading / P&L. Income and Expense must, and cannot be Bank, Store or Party.
- **Opening balance** (`op_bal`) is stored on the account's normal side: positive = debit for Assets/Expense, credit for Liability/Income.
- Payments (CP, BP): each line is **debited**, the cash/bank account is **credited**. Receipts (CR, BR): the reverse.
- Journals must balance. One side has a single account; each line on the other side becomes one `trction` row.
- Voucher numbers restart each working year; cheque vouchers are numbered separately for each bank. Journal numbers restart each day.
- Balances are calculated from `trction`, never stored. Same-day order in reports: BR, CR, BP, CP, JR.
- Gross profit includes Trading **and** Manufacturing heads. The balance sheet adds profit to date on the liabilities side, so both sides always match.
---
 
## Bangla voice entry (in progress)
 
Goal: say a voucher in Bangla, e.g. *"আজকে অফিস ভাড়া ত্রিশ হাজার টাকা ক্যাশ দিলাম"* ("Today I paid thirty thousand taka office rent in cash"), and the voucher form fills itself. The user checks it and presses Save; the AI never saves on its own.
 
```
Voice (phone/laptop) → Whisper (speech → Bangla text) → small LLM (text → voucher JSON)
                     → backend matches the spoken account name to the company's ledgers
                     → voucher form filled for review
```
 
- **Own model, no API limits, data stays on the server.** Open models are fine-tuned on recordings collected with the `/record` page, then run locally.
- **Works for any company.** The model outputs the account name as spoken ("office rent"); the backend matches it to that company's chart of accounts, so new clients don't need retraining.
- **Fair testing.** Speakers in the test set never appear in training.
Progress:
 
- [x] Recording page with consent, speaker details, "read a sentence" and "say it your own way" modes
- [x] Labels generated by the server (nobody labels by hand), JSONL export
- [ ] Collect ~1,000 recordings from 15–20 speakers (mostly phones)
- [ ] Data preparation script (16 kHz WAV, train/test split by speaker)
- [ ] Fine-tune Whisper and the text → voucher model, measure accuracy
- [ ] Mic button on the voucher page
---
 
## Roadmap
 
- [x] Journal voucher (debit and credit lines that must balance)
- [x] Reports: books, ledger, trial balance, Trading & P/L, balance sheet
- [x] Company profile (Settings)
- [ ] Reports: project-wise trial balance, cost centre, vehicle log
- [ ] Bangla voice entry (see above)
- [ ] Projects: project details, Up Heads, Valuation
- [ ] Inventory: godowns, items, item properties
- [ ] System: users and roles
- [ ] Import the old FoxPro `.dbf` data into SQL Server
---
 
## Credits
 
Original Technosoft system designed and written in Visual FoxPro .
 
