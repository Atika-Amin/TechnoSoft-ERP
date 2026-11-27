import { useMemo, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  FileSpreadsheet,
  FileText,
  Landmark,
  Layers,
  Loader2,
  NotebookText,
  Play,
  Printer,
  Scale,
  Wallet,
} from 'lucide-react';
import {
  getBalanceSheet,
  getJournalBook,
  getLedgerReport,
  getProfitLoss,
  getReportOptions,
  getSubGroupReport,
  getTrialBalance,
  type Balance,
  type BalanceSheetReport,
  type BalanceSide,
  type JournalBookReport,
  type LedgerReport,
  type PLLine,
  type ProfitLossReport,
  type SubGroupReport,
  type TrialBalanceReport,
} from '../api/reports.api';
import { getCompany } from '../../settings/api/company.api';
import { AccountPicker } from '../../vouchers/pages/VoucherPage';
import { apiErrorMessage } from '../../../lib/axios';

type ReportKey = 'cash' | 'bank' | 'journal' | 'ledger' | 'subgroup' | 'trial' | 'pl' | 'bs';

// Same menu as the old Reports screen: Books, Ledger, Bank Book
const MENU: { group: string; items: { key: ReportKey; label: string; hint: string; icon: typeof Wallet }[] }[] = [
  {
    group: 'Books',
    items: [
      { key: 'cash', label: 'Cash book', hint: 'Day by day, with opening and closing', icon: Wallet },
      { key: 'bank', label: 'Bank book', hint: 'One bank account, day by day', icon: Landmark },
      { key: 'journal', label: 'Journal book', hint: 'Every journal voucher in the period', icon: NotebookText },
    ],
  },
  {
    group: 'Ledger',
    items: [
      { key: 'ledger', label: 'Ledger', hint: 'One account with running balance', icon: BookOpen },
      { key: 'subgroup', label: 'Sub-group ledger', hint: 'Every ledger of a sub group', icon: Layers },
    ],
  },
  {
    group: 'Final accounts',
    items: [
      { key: 'trial', label: 'Trial balance', hint: 'Every ledger: opening, period, closing', icon: Scale },
      { key: 'pl', label: 'Trading & Profit / Loss', hint: 'Gross profit and net profit', icon: FileText },
      { key: 'bs', label: 'Balance sheet', hint: 'Assets and liabilities on a date', icon: Landmark },
    ],
  },
];

// Second choice shown for some reports (FoxPro optiongroup2)
const MODES: Partial<Record<ReportKey, { key: string; label: string }[]>> = {
  trial: [
    { key: 'periodic', label: 'Periodic (opening · period · closing)' },
    { key: 'upto', label: 'Up to date (closing only)' },
  ],
  bs: [
    { key: 'detailed', label: 'Descriptive (every ledger)' },
    { key: 'short', label: 'Short (sub-group totals)' },
  ],
};

const TITLES: Record<ReportKey, string> = {
  cash: 'Cash Book',
  bank: 'Bank Book',
  journal: 'Journal Book',
  ledger: 'Ledger',
  subgroup: 'Sub-group Ledger',
  trial: 'Trial Balance',
  pl: 'Trading and Profit & Loss Account',
  bs: 'Balance Sheet',
};

const TYPE_NAME: Record<number, string> = { 1: 'Cash Payment', 2: 'Cash Received', 4: 'Cheque Payment', 5: 'Cheque Received', 6: 'Journal' };

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const showDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const money = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const amount = (n: number) => (n ? money(n) : '');
const bal = (b: Balance) => (b.amount ? `${money(b.amount)} ${b.side}` : '0.00');

// Working year from login: report dates default to its start → today
function defaultRange() {
  const start = Number((localStorage.getItem('workingYear') ?? '').slice(0, 4)) || new Date().getFullYear();
  const from = `${start}-07-01`;
  const max = `${start + 1}-06-30`;
  const today = toIso(new Date());
  return { from, to: today < from ? from : today > max ? max : today };
}

// "To Excel": a CSV file that Excel opens directly
function downloadCsv(fileName: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

interface Run {
  report: ReportKey;
  account: string;
  from: string;
  to: string;
  mode: string;
}

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';
const th = 'px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500';
const td = 'px-3 py-2 align-top print:px-1.5 print:py-1';
const num = 'px-3 py-2 text-right align-top tabular-nums whitespace-nowrap print:px-1.5 print:py-1';

export default function ReportsPage() {
  const options = useQuery({ queryKey: ['report-options'], queryFn: getReportOptions });
  const company = useQuery({ queryKey: ['company'], queryFn: getCompany });

  const [report, setReport] = useState<ReportKey>('cash');
  const [account, setAccount] = useState('');
  const [{ from, to }, setRange] = useState(defaultRange);
  const [run, setRun] = useState<Run | null>(null);
  const [mode, setMode] = useState('');
  const [formError, setFormError] = useState('');

  const all = useMemo(() => options.data ?? [], [options.data]);
  const ledgers = useMemo(() => all.filter((o) => o.level === 'LEDGER'), [all]);

  // Which accounts the picker offers for this report
  const choices =
    report === 'cash'
      ? ledgers.filter((l) => l.ledgerType === 'CASH')
      : report === 'bank'
        ? ledgers.filter((l) => l.ledgerType === 'BANK')
        : report === 'subgroup'
          ? all.filter((o) => o.level === 'SUBGROUP')
          : ledgers;
  const needsAccount = ['cash', 'bank', 'ledger', 'subgroup'].includes(report);
  const modes = MODES[report];
  const modeValue = modes?.some((m) => m.key === mode) ? mode : (modes?.[0].key ?? '');
  // Balance sheet and "up to date" trial balance only need one date
  const singleDate = report === 'bs' || (report === 'trial' && modeValue === 'upto');
  const chosen =
    choices.find((c) => c.code === account) ??
    (report === 'cash' ? choices.find((c) => c.code === '000001') : undefined) ??
    (report === 'ledger' ? undefined : choices[0]);
  const accountValue = chosen?.code ?? '';

  const result = useQuery({
    queryKey: ['report', run],
    enabled: !!run,
    queryFn: async () => {
      const r = run!;
      if (r.report === 'journal') return { kind: 'journal' as const, data: await getJournalBook(r.from, r.to) };
      if (r.report === 'trial') return { kind: 'trial' as const, data: await getTrialBalance(r.from, r.to) };
      if (r.report === 'pl') return { kind: 'pl' as const, data: await getProfitLoss(r.from, r.to) };
      if (r.report === 'bs') return { kind: 'bs' as const, data: await getBalanceSheet(r.to) };
      if (r.report === 'subgroup') return { kind: 'subgroup' as const, data: await getSubGroupReport(r.account, r.from, r.to) };
      return { kind: r.report as 'cash' | 'bank' | 'ledger', data: await getLedgerReport(r.account, r.from, r.to) };
    },
  });

  const pickReport = (key: ReportKey) => {
    setReport(key);
    setAccount('');
    setMode('');
    setRun(null);
    setFormError('');
  };

  const show = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (needsAccount && !accountValue) return setFormError('Choose an account first.');
    if (!to || (!singleDate && (!from || from > to))) return setFormError('Start date must be before the end date.');
    setRun({ report, account: accountValue, from, to, mode: modeValue });
  };

  // ── Excel export for the report on screen ──
  const exportExcel = () => {
    if (!result.data || !run) return;
    const name = run.report === 'bs' ? `${TITLES.bs} ${run.to}.csv` : `${TITLES[run.report]} ${run.from} to ${run.to}.csv`;
    const r = result.data;
    if (r.kind === 'journal') {
      const rows: (string | number)[][] = [['Date', 'Voucher', 'Account', 'Debit', 'Credit', 'Remarks']];
      r.data.journals.forEach((j) => {
        j.debits.forEach((d) => rows.push([showDate(j.date), j.voucherNo, d.name, d.amount, '', '']));
        j.credits.forEach((c) => rows.push([showDate(j.date), j.voucherNo, `To ${c.name}`, '', c.amount, '']));
        rows.push(['', '', `Being the amount ${j.remark}`, '', '', '']);
      });
      return downloadCsv(name, rows);
    }
    if (r.kind === 'trial') {
      const rows: (string | number)[][] = [['Group', 'Sub group', 'Code', 'Ledger', 'Opening Dr', 'Opening Cr', 'Debit', 'Credit', 'Closing Dr', 'Closing Cr']];
      r.data.rows.forEach((x) =>
        rows.push([x.groupName, x.subGroupName, x.code, x.name, x.opening.side === 'Dr' ? x.opening.amount : '', x.opening.side === 'Cr' ? x.opening.amount : '', x.debit, x.credit, x.closing.side === 'Dr' ? x.closing.amount : '', x.closing.side === 'Cr' ? x.closing.amount : '']),
      );
      const t = r.data.totals;
      rows.push(['', '', '', 'Total', t.openDr, t.openCr, t.debit, t.credit, t.closeDr, t.closeCr]);
      return downloadCsv(name, rows);
    }
    if (r.kind === 'pl') {
      const rows: (string | number)[][] = [['Section', 'Sub group', 'Code', 'Particulars', 'Debit', 'Credit']];
      const add = (title: string, lines: PLLine[]) => lines.forEach((l) => rows.push([title, l.subGroupName, l.code, l.name, l.debit || '', l.credit || '']));
      add('Trading', r.data.trading.lines);
      rows.push(['Trading', '', '', r.data.trading.grossProfit >= 0 ? 'Gross profit' : 'Gross loss', '', Math.abs(r.data.trading.grossProfit)]);
      add('Profit & Loss', r.data.profitLoss.lines);
      rows.push(['Profit & Loss', '', '', r.data.profitLoss.netProfit >= 0 ? 'Net profit' : 'Net loss', '', Math.abs(r.data.profitLoss.netProfit)]);
      add('Appropriation', r.data.appropriation.lines);
      return downloadCsv(name, rows);
    }
    if (r.kind === 'bs') {
      const rows: (string | number)[][] = [['Side', 'Group', 'Sub group', 'Code', 'Ledger', 'Amount']];
      const add = (title: string, s: BalanceSide) =>
        s.groups.forEach((g) => g.subGroups.forEach((sg) => sg.lines.forEach((l) => rows.push([title, g.name, sg.name, l.code, l.name, l.amount]))));
      add('Liabilities', r.data.liabilities);
      rows.push(['Liabilities', '', '', '', 'Profit & Loss A/c (to date)', r.data.profit]);
      rows.push(['Liabilities', '', '', '', 'Total', r.data.totals.liabilities]);
      add('Assets', r.data.assets);
      rows.push(['Assets', '', '', '', 'Total', r.data.totals.assets]);
      return downloadCsv(name, rows);
    }
    if (r.kind === 'subgroup') {
      const rows: (string | number)[][] = [['Code', 'Ledger', 'Opening', 'Debit', 'Credit', 'Closing']];
      r.data.rows.forEach((x) => rows.push([x.code, x.name, bal(x.opening), x.debit, x.credit, bal(x.closing)]));
      rows.push(['', 'Total', bal(r.data.totals.opening), r.data.totals.debit, r.data.totals.credit, bal(r.data.totals.closing)]);
      return downloadCsv(name, rows);
    }
    const d = r.data;
    const rows: (string | number)[][] = [['Date', 'Voucher', 'Particulars', 'Remarks', 'Debit', 'Credit', 'Balance']];
    rows.push(['', '', 'Opening balance', '', '', '', bal(d.opening)]);
    d.lines.forEach((l) => rows.push([showDate(l.date), l.voucherNo, l.otherName, l.remarks, l.debit || '', l.credit || '', bal(l.balance)]));
    rows.push(['', '', 'Total', '', d.totals.debit, d.totals.credit, '']);
    rows.push(['', '', 'Closing balance', '', '', '', bal(d.closing)]);
    downloadCsv(name, rows);
  };

  const hasRows =
    !!result.data &&
    (result.data.kind === 'journal'
      ? result.data.data.journals.length > 0
      : result.data.kind === 'subgroup' || result.data.kind === 'trial'
        ? result.data.data.rows.length > 0
        : true);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="print:hidden">
        <p className="text-sm text-slate-500">Accounts</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr] print:block">
        {/* ── Report menu ── */}
        <nav className="space-y-5 print:hidden">
          {MENU.map((g) => (
            <div key={g.group}>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{g.group}</p>
              <div className="space-y-1.5">
                {g.items.map(({ key, label, hint, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pickReport(key)}
                    className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                      report === key ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:bg-white'
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${report === key ? 'text-[#4338ca]' : 'text-slate-400'}`} />
                    <span>
                      <span className={`block text-sm font-medium ${report === key ? 'text-indigo-900' : 'text-slate-800'}`}>{label}</span>
                      <span className="block text-xs text-slate-500">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
</nav>

        <div className="min-w-0 space-y-4">
          {/* ── Filters ── */}
          <form onSubmit={show} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
            <div className="flex flex-wrap items-end gap-3">
              {needsAccount && (
                <div className="min-w-[260px] flex-1">
                  <label htmlFor="report-account" className="mb-1.5 block text-sm font-medium text-slate-700">
                    {report === 'cash' ? 'Cash account' : report === 'bank' ? 'Bank' : report === 'subgroup' ? 'Sub group' : 'Ledger'}
                  </label>
                  {report === 'ledger' ? (
                    <div className="rounded-lg border border-slate-300 bg-white px-1">
                      <AccountPicker label="Ledger" ledgers={ledgers} value={accountValue} onSelect={(l) => setAccount(l.code)} />
                    </div>
                  ) : (
                    <select
                      id="report-account"
                      value={accountValue}
                      onChange={(e) => setAccount(e.target.value)}
                      className={inputClass}
                    >
                      {choices.length === 0 && <option value="">Nothing to choose yet</option>}
                      {choices.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} · {c.code}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              {modes && (
                <div className="min-w-[240px] flex-1">
                  <label htmlFor="report-mode" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Type
                  </label>
                  <select id="report-mode" value={modeValue} onChange={(e) => setMode(e.target.value)} className={inputClass}>
                    {modes.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {!singleDate && (
                <div className="w-44">
                  <label htmlFor="report-from" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Start date
                  </label>
                  <input id="report-from" type="date" value={from} onChange={(e) => setRange({ from: e.target.value, to })} className={inputClass} />
                </div>
              )}
              <div className="w-44">
                <label htmlFor="report-to" className="mb-1.5 block text-sm font-medium text-slate-700">
                  {singleDate ? 'As on date' : 'End date'}
                </label>
                <input id="report-to" type="date" value={to} onChange={(e) => setRange({ from, to: e.target.value })} className={inputClass} />
              </div>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#4338ca] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3730a3]"
              >
                {result.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Show
              </button>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  disabled={!hasRows}
                  onClick={() => window.print()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
                <button
                  type="button"
                  disabled={!hasRows}
                  onClick={exportExcel}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Excel
                </button>
              </div>
            </div>
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          </form>

          {/* ── Result ── */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
            {!run ? (
              <p className="px-6 py-16 text-center text-sm text-slate-500">Choose the options above and press Show.</p>
            ) : result.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : result.isError ? (
              <p className="px-6 py-16 text-center text-sm text-red-600">{apiErrorMessage(result.error)}</p>
            ) : result.data ? (
              <>
                {/* Report heading, also printed */}
                <div className="border-b border-slate-200 px-6 py-5 text-center">
                  <p className="text-lg font-semibold text-slate-900">{company.data?.name}</p>
                  {(company.data?.address1 || company.data?.address2) && (
                    <p className="text-xs text-slate-500">{[company.data?.address1, company.data?.address2].filter(Boolean).join(', ')}</p>
                  )}
                  <p className="mt-3 text-base font-semibold text-slate-800">
                    {TITLES[run.report]}
                    {result.data.kind === 'subgroup'
                      ? ` · ${result.data.data.subGroup.name}`
                      : result.data.kind === 'cash' || result.data.kind === 'bank' || result.data.kind === 'ledger'
                        ? ` · ${result.data.data.account.name} (${result.data.data.account.code})`
                        : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    {run.report === 'bs'
                      ? `As on ${showDate(run.to)}`
                      : run.report === 'trial' && run.mode === 'upto'
                        ? `As on ${showDate(run.to)}`
                        : `From ${showDate(run.from)} to ${showDate(run.to)}`}
                  </p>
                </div>

                <div className="overflow-x-auto print:overflow-visible">
                  {result.data.kind === 'trial' ? (
                    <TrialBalanceTable data={result.data.data} upTo={run.mode === 'upto'} />
                  ) : result.data.kind === 'pl' ? (
                    <ProfitLossTable data={result.data.data} />
                  ) : result.data.kind === 'bs' ? (
                    <BalanceSheetTable data={result.data.data} short={run.mode === 'short'} />
                  ) : result.data.kind === 'journal' ? (
                    <JournalBookTable data={result.data.data} />
                  ) : result.data.kind === 'subgroup' ? (
                    <SubGroupTable data={result.data.data} />
                  ) : result.data.kind === 'ledger' ? (
                    <LedgerTable data={result.data.data} />
                  ) : (
                    <DayBookTable data={result.data.data} />
                  )}
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Ledger: one account with running balance (FoxPro indled + indledsort) ──
function LedgerTable({ data }: { data: LedgerReport }) {
  return (
    <table className="w-full min-w-[680px] text-[13px] [&_td]:px-2 [&_th]:px-2 [&_th]:tracking-normal">
      <thead className="border-b border-slate-200 bg-slate-50">
        <tr>
          <th className={th}>Date</th>
          <th className={th}>Voucher</th>
          <th className={th}>Particulars</th>
          <th className={th}>Remarks</th>
          <th className={`${th} text-right`}>Debit</th>
          <th className={`${th} text-right`}>Credit</th>
          <th className={`${th} text-right`}>Balance</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        <tr className="bg-slate-50/60 font-medium">
          <td className={td} colSpan={6}>
            Opening balance
          </td>
          <td className={num}>{bal(data.opening)}</td>
        </tr>
        {data.lines.map((l, i) => (
          <tr key={i}>
            <td className={`${td} whitespace-nowrap tabular-nums`}>{showDate(l.date)}</td>
            <td className={`${td} whitespace-nowrap`} title={TYPE_NAME[l.type]}>
              {l.voucherNo}
            </td>
            <td className={td}>{l.otherName}</td>
            <td className={`${td} max-w-[180px] truncate text-slate-500`} title={l.remarks}>{l.remarks}</td>
            <td className={num}>{amount(l.debit)}</td>
            <td className={num}>{amount(l.credit)}</td>
            <td className={num}>{bal(l.balance)}</td>
          </tr>
        ))}
        {data.lines.length === 0 && (
          <tr>
            <td className={`${td} text-center text-slate-500`} colSpan={7}>
              No entries in this period.
            </td>
          </tr>
        )}
      </tbody>
      <tfoot className="border-t-2 border-slate-200 font-semibold">
        <tr>
          <td className={td} colSpan={4}>
            Total
          </td>
          <td className={num}>{money(data.totals.debit)}</td>
          <td className={num}>{money(data.totals.credit)}</td>
          <td />
        </tr>
        <tr className="bg-slate-50">
          <td className={td} colSpan={6}>
            Closing balance
          </td>
          <td className={num}>{bal(data.closing)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

// ── Cash / Bank book: the ledger grouped by day (FoxPro cashbank) ──
function DayBookTable({ data }: { data: LedgerReport }) {
  const days: { date: string; lines: LedgerReport['lines'] }[] = [];
  data.lines.forEach((l) => {
    const last = days[days.length - 1];
    if (last && last.date === l.date) last.lines.push(l);
    else days.push({ date: l.date, lines: [l] });
  });
  let opening = data.opening;

  return (
    <table className="w-full min-w-[680px] text-sm">
      <thead className="border-b border-slate-200 bg-slate-50">
        <tr>
          <th className={th}>Voucher</th>
          <th className={th}>Particulars</th>
          <th className={th}>Remarks</th>
          <th className={`${th} text-right`}>Receipt</th>
          <th className={`${th} text-right`}>Payment</th>
          <th className={`${th} text-right`}>Balance</th>
        </tr>
      </thead>
      {days.length === 0 && (
        <tbody>
          <tr>
            <td className={`${td} text-center text-slate-500`} colSpan={6}>
              No entries in this period. Balance: {bal(data.opening)}
            </td>
          </tr>
        </tbody>
      )}
      {days.map((day) => {
        const dayOpening = opening;
        const receipts = day.lines.reduce((s, l) => s + l.debit, 0);
        const payments = day.lines.reduce((s, l) => s + l.credit, 0);
        const closing = day.lines[day.lines.length - 1].balance;
        opening = closing;
        return (
          <tbody key={day.date} className="divide-y divide-slate-100 border-b-2 border-slate-200">
            <tr className="bg-indigo-50/60">
              <td className={`${td} font-semibold text-indigo-900`} colSpan={5}>
                {showDate(day.date)} · Opening balance
              </td>
              <td className={`${num} font-semibold text-indigo-900`}>{bal(dayOpening)}</td>
            </tr>
            {day.lines.map((l, i) => (
              <tr key={i}>
                <td className={`${td} whitespace-nowrap`} title={TYPE_NAME[l.type]}>
                  {l.voucherNo}
                </td>
                <td className={td}>{l.otherName}</td>
                <td className={`${td} max-w-[180px] truncate text-slate-500`} title={l.remarks}>{l.remarks}</td>
                <td className={num}>{amount(l.debit)}</td>
                <td className={num}>{amount(l.credit)}</td>
                <td className={`${num} text-slate-500`}>{bal(l.balance)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-medium">
              <td className={td} colSpan={3}>
                Closing balance
              </td>
              <td className={num}>{money(receipts)}</td>
              <td className={num}>{money(payments)}</td>
              <td className={num}>{bal(closing)}</td>
            </tr>
          </tbody>
        );
      })}
      <tfoot className="font-semibold">
        <tr>
          <td className={td} colSpan={3}>
            Period total
          </td>
          <td className={num}>{money(data.totals.debit)}</td>
          <td className={num}>{money(data.totals.credit)}</td>
          <td className={num}>{bal(data.closing)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

// ── Sub-group ledger: each ledger with opening, debit, credit, closing (FoxPro grpled) ──
function SubGroupTable({ data }: { data: SubGroupReport }) {
  return (
    <table className="w-full min-w-[600px] text-sm">
      <thead className="border-b border-slate-200 bg-slate-50">
        <tr>
          <th className={th}>Code</th>
          <th className={th}>Ledger</th>
          <th className={`${th} text-right`}>Opening</th>
          <th className={`${th} text-right`}>Debit</th>
          <th className={`${th} text-right`}>Credit</th>
          <th className={`${th} text-right`}>Closing</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {data.rows.map((r) => (
          <tr key={r.code}>
            <td className={`${td} tabular-nums text-slate-500`}>{r.code}</td>
            <td className={td}>{r.name}</td>
            <td className={num}>{bal(r.opening)}</td>
            <td className={num}>{amount(r.debit)}</td>
            <td className={num}>{amount(r.credit)}</td>
            <td className={`${num} font-medium`}>{bal(r.closing)}</td>
          </tr>
        ))}
        {data.rows.length === 0 && (
          <tr>
            <td className={`${td} text-center text-slate-500`} colSpan={6}>
              No balances or entries for this sub group.
            </td>
          </tr>
        )}
      </tbody>
      <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
        <tr>
          <td className={td} colSpan={2}>
            Total
          </td>
          <td className={num}>{bal(data.totals.opening)}</td>
          <td className={num}>{money(data.totals.debit)}</td>
          <td className={num}>{money(data.totals.credit)}</td>
          <td className={num}>{bal(data.totals.closing)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

// ── Journal book: debit heads, "To" credit heads, "Being the amount …" (FoxPro jbook + jvbook) ──
function JournalBookTable({ data }: { data: JournalBookReport }) {
  return (
    <table className="w-full min-w-[600px] text-sm">
      <thead className="border-b border-slate-200 bg-slate-50">
        <tr>
          <th className={th}>Date</th>
          <th className={th}>Voucher</th>
          <th className={th}>Heads</th>
          <th className={`${th} text-right`}>Debit</th>
          <th className={`${th} text-right`}>Credit</th>
        </tr>
      </thead>
      {data.journals.length === 0 && (
        <tbody>
          <tr>
            <td className={`${td} text-center text-slate-500`} colSpan={5}>
              No journal vouchers in this period.
            </td>
          </tr>
        </tbody>
      )}
      {data.journals.map((j) => (
        <tbody key={j.date + j.voucherNo} className="border-b border-slate-200">
          {j.debits.map((d, i) => (
            <tr key={'d' + d.code}>
              <td className={`${td} whitespace-nowrap tabular-nums`}>{i === 0 ? showDate(j.date) : ''}</td>
              <td className={`${td} whitespace-nowrap font-medium`}>{i === 0 ? j.voucherNo : ''}</td>
              <td className={td}>{d.name} Dr.</td>
              <td className={num}>{money(d.amount)}</td>
              <td />
            </tr>
          ))}
          {j.credits.map((c) => (
            <tr key={'c' + c.code}>
              <td />
              <td />
              <td className={`${td} pl-10`}>To {c.name}</td>
              <td />
              <td className={num}>{money(c.amount)}</td>
            </tr>
          ))}
          <tr>
            <td />
            <td />
            <td className={`${td} pb-3 italic text-slate-500`} colSpan={3}>
              (Being the amount {j.remark || '…'})
            </td>
          </tr>
        </tbody>
      ))}
      <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
        <tr>
          <td className={td} colSpan={3}>
            Total · {data.journals.length} journal{data.journals.length === 1 ? '' : 's'}
          </td>
          <td className={num}>{money(data.total)}</td>
          <td className={num}>{money(data.total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

// Warning when the books don't balance (shown, never hidden)
function OutOfBalance({ difference }: { difference: number }) {
  if (!difference) return null;
  return (
    <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-6 py-2.5 text-sm text-red-700">
      <AlertTriangle className="h-4 w-4 shrink-0" /> Out of balance by {money(Math.abs(difference))}. Check opening balances in the Chart of Accounts.
    </div>
  );
}

// ── Trial balance (FoxPro opbaltrl = Periodic, trial = Up to) ──
function TrialBalanceTable({ data, upTo }: { data: TrialBalanceReport; upTo: boolean }) {
  const t = data.totals;
  const cols = upTo ? 3 : 7;
  let lastSub = '';
  return (
    <>
      <OutOfBalance difference={data.difference} />
      <table className="w-full min-w-[680px] text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={th}>Particulars</th>
            {!upTo && (
              <>
                <th className={`${th} text-right`}>Opening Dr</th>
                <th className={`${th} text-right`}>Opening Cr</th>
                <th className={`${th} text-right`}>Debit</th>
                <th className={`${th} text-right`}>Credit</th>
              </>
            )}
            <th className={`${th} text-right`}>{upTo ? 'Debit' : 'Closing Dr'}</th>
            <th className={`${th} text-right`}>{upTo ? 'Credit' : 'Closing Cr'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.rows.map((r) => {
            const heading = r.subGroupName !== lastSub;
            lastSub = r.subGroupName;
            return [
              heading && (
                <tr key={'h' + r.code} className="bg-slate-50/70">
                  <td className={`${td} font-semibold text-slate-700`} colSpan={cols}>
                    {r.subGroupName} <span className="font-normal text-slate-400">· {r.groupName}</span>
                  </td>
                </tr>
              ),
              <tr key={r.code}>
                <td className={`${td} min-w-[170px]`}>
                  {r.name} <span className="text-xs tabular-nums text-slate-400">{r.code}</span>
                </td>
                {!upTo && (
                  <>
                    <td className={num}>{r.opening.side === 'Dr' ? money(r.opening.amount) : ''}</td>
                    <td className={num}>{r.opening.side === 'Cr' ? money(r.opening.amount) : ''}</td>
                    <td className={num}>{amount(r.debit)}</td>
                    <td className={num}>{amount(r.credit)}</td>
                  </>
                )}
                <td className={`${num} font-medium`}>{r.closing.side === 'Dr' ? money(r.closing.amount) : ''}</td>
                <td className={`${num} font-medium`}>{r.closing.side === 'Cr' ? money(r.closing.amount) : ''}</td>
              </tr>,
            ];
          })}
          {data.rows.length === 0 && (
            <tr>
              <td className={`${td} text-center text-slate-500`} colSpan={cols}>
                No balances in this period.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
          <tr>
            <td className={td}>
              Total
            </td>
            {!upTo && (
              <>
                <td className={num}>{money(t.openDr)}</td>
                <td className={num}>{money(t.openCr)}</td>
                <td className={num}>{money(t.debit)}</td>
                <td className={num}>{money(t.credit)}</td>
              </>
            )}
            <td className={num}>{money(t.closeDr)}</td>
            <td className={num}>{money(t.closeCr)}</td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}

// ── Trading and Profit & Loss account (FoxPro traacc + placc) ──
function ProfitLossTable({ data }: { data: ProfitLossReport }) {
  const section = (title: string, lines: PLLine[]) => {
    let lastSub = '';
    return [
      <tr key={title} className="bg-indigo-50/60">
        <td className={`${td} font-semibold text-indigo-900`} colSpan={4}>
          {title}
        </td>
      </tr>,
      ...lines.flatMap((l) => {
        const heading = l.subGroupName !== lastSub;
        lastSub = l.subGroupName;
        return [
          heading && (
            <tr key={title + 'h' + l.code}>
              <td />
              <td className={`${td} text-xs font-semibold uppercase tracking-wider text-slate-500`} colSpan={3}>
                {l.subGroupName}
              </td>
            </tr>
          ),
          <tr key={title + l.code}>
            <td className={`${td} tabular-nums text-slate-500`}>{l.code}</td>
            <td className={`${td} pl-6`}>
              {l.name}
              {l.section === 'MANUFACTURING' && <span className="ml-2 text-xs text-slate-400">manufacturing</span>}
            </td>
            <td className={num}>{amount(l.debit)}</td>
            <td className={num}>{amount(l.credit)}</td>
          </tr>,
        ];
      }),
      lines.length === 0 && (
        <tr key={title + 'empty'}>
          <td />
          <td className={`${td} text-slate-400`} colSpan={3}>
            No entries
          </td>
        </tr>
      ),
    ];
  };
  const result = (label: string, value: number, loss: string) => (
    <tr className="border-y-2 border-slate-200 bg-slate-50 font-semibold">
      <td />
      <td className={td}>{value >= 0 ? label : loss}</td>
      <td className={num} />
      <td className={`${num} ${value >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
        {value >= 0 ? '' : '− '}
        {money(Math.abs(value))}
      </td>
    </tr>
  );

  return (
    <table className="w-full min-w-[600px] text-sm">
      <thead className="border-b border-slate-200 bg-slate-50">
        <tr>
          <th className={th}>Code</th>
          <th className={th}>Particulars</th>
          <th className={`${th} text-right`}>Debit</th>
          <th className={`${th} text-right`}>Credit</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {section('Trading Account', data.trading.lines)}
        {result('Gross profit', data.trading.grossProfit, 'Gross loss')}
        {section('Profit & Loss Account', data.profitLoss.lines)}
        {result('Net profit', data.profitLoss.netProfit, 'Net loss')}
        {data.appropriation.lines.length > 0 && (
          <>
            {section('Profit & Loss Appropriation', data.appropriation.lines)}
            {result('Balance carried to capital', data.appropriation.retained, 'Loss carried to capital')}
          </>
        )}
      </tbody>
    </table>
  );
}

// ── Balance sheet (FoxPro balsh = Descriptive, sgrblash = Short) ──
function BalanceSheetTable({ data, short }: { data: BalanceSheetReport; short: boolean }) {
  const side = (title: string, s: BalanceSide, extra?: { label: string; amount: number }, total?: number) => (
    <>
      <tr className="bg-indigo-50/60">
        <td className={`${td} font-semibold text-indigo-900`} colSpan={3}>
          {title}
        </td>
      </tr>
      {s.groups.map((g) => (
        <BalanceGroup key={g.name} group={g} short={short} />
      ))}
      {extra && (
        <tr>
          <td />
          <td className={`${td} font-medium`}>{extra.label}</td>
          <td className={`${num} font-medium ${extra.amount < 0 ? 'text-red-700' : ''}`}>{money(extra.amount)}</td>
        </tr>
      )}
      <tr className="border-y-2 border-slate-300 bg-slate-50 font-semibold">
        <td />
        <td className={td}>Total {title.toLowerCase()}</td>
        <td className={num}>{money(total ?? s.total)}</td>
      </tr>
    </>
  );
  return (
    <>
      <OutOfBalance difference={data.difference} />
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={th}>Code</th>
            <th className={th}>Particulars</th>
            <th className={`${th} text-right`}>Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {side(
            'Capital & Liabilities',
            data.liabilities,
            { label: data.profit >= 0 ? 'Add: Profit & Loss A/c (to date)' : 'Less: Loss to date', amount: data.profit },
            data.totals.liabilities,
          )}
          {side('Assets', data.assets)}
        </tbody>
      </table>
    </>
  );
}

function BalanceGroup({ group, short }: { group: BalanceSide['groups'][number]; short: boolean }) {
  return (
    <>
      <tr>
        <td />
        <td className={`${td} font-semibold text-slate-800`}>{group.name}</td>
        <td className={`${num} font-semibold`}>{short ? money(group.total) : ''}</td>
      </tr>
      {group.subGroups.map((sg) =>
        short ? (
          <tr key={sg.name}>
            <td />
            <td className={`${td} pl-8 text-slate-600`}>{sg.name}</td>
            <td className={`${num} text-slate-600`}>{money(sg.total)}</td>
          </tr>
        ) : (
          [
            <tr key={sg.name}>
              <td />
              <td className={`${td} pl-6 text-xs font-semibold uppercase tracking-wider text-slate-500`} colSpan={2}>
                {sg.name}
              </td>
            </tr>,
            ...sg.lines.map((l) => (
              <tr key={l.code}>
                <td className={`${td} tabular-nums text-slate-500`}>{l.code}</td>
                <td className={`${td} pl-10`}>{l.name}</td>
                <td className={num}>{money(l.amount)}</td>
              </tr>
            )),
            <tr key={sg.name + 't'}>
              <td />
              <td className={`${td} pl-10 text-slate-500`}>Total {sg.name}</td>
              <td className={`${num} border-t border-slate-200 text-slate-600`}>{money(sg.total)}</td>
            </tr>,
          ]
        ),
      )}
    </>
  );
}
