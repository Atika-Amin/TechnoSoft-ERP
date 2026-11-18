import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Info,
  Landmark,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react';
import { getVoucher, type LedgerOption, type VoucherType } from '../api/vouchers.api';
import { useNextVoucherNo, useSaveVoucher, useVoucherSetup } from '../hooks/useVouchers';
import { apiErrorMessage } from '../../../lib/axios';

// The four buttons of the old ventry form
const TYPES: {
  key: VoucherType;
  label: string;
  hint: string;
  isBank: boolean;
  isPayment: boolean;
}[] = [
    { key: 'CP', label: 'Cash Payment', hint: 'Money paid out in cash', isBank: false, isPayment: true },
    { key: 'CR', label: 'Cash Received', hint: 'Money received in cash', isBank: false, isPayment: false },
    { key: 'BP', label: 'Cheque Payment', hint: 'Paid from a bank account', isBank: true, isPayment: true },
    { key: 'BR', label: 'Cheque Received', hint: 'Received into a bank account', isBank: true, isPayment: false },
  ];

// One grid row (FoxPro cursor code1)
interface Row {
  key: number;
  accountCode: string; // hcode
  amount: string; // taka (kept as text while typing)
  remarks: string;
  jobCode: string; // prjcode, '' = none
}

let nextKey = 1;
const blankRow = (jobCode: string): Row => ({ key: nextKey++, accountCode: '', amount: '', remarks: '', jobCode });

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const taka = (n: number) => '৳ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Working year from login, e.g. "2026-2027" → 2026-07-01 … 2027-06-30
function fiscalRange() {
  const start = Number((localStorage.getItem('workingYear') ?? '').slice(0, 4)) || new Date().getFullYear();
  return { min: `${start}-07-01`, max: `${start + 1}-06-30`, label: `FY ${start}-${start + 1}` };
}

function defaultDate() {
  const { min, max } = fiscalRange();
  const today = toIso(new Date());
  return today < min ? min : today > max ? max : today;
}

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:text-slate-500';
const cellClass =
  'h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 hover:border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10';

export default function VoucherPage() {
  const { data: setup, isLoading, isError } = useVoucherSetup();
  const { mutate, isPending } = useSaveVoucher();
  const ledgers = useMemo(() => setup?.ledgers ?? [], [setup]);
  const jobs = setup?.jobs ?? [];
  const defaultJob = jobs.find((j) => j.isDefault)?.code ?? ''; // FoxPro: jprofile.defalt == 1

  const [type, setType] = useState<VoucherType>('CP');
  const [counterCode, setCounterCode] = useState('');
  const [numberInput, setNumberInput] = useState('');
  const [editNo, setEditNo] = useState<string | null>(null); // voucher being edited, null = new
  const [date, setDate] = useState(defaultDate);
  const [rows, setRows] = useState<Row[]>(() => [blankRow('')]);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notice, setNotice] = useState('');

  const info = TYPES.find((t) => t.key === type)!;
  const fy = fiscalRange();

  // Cash vouchers use a Cash ledger, cheque vouchers a Bank ledger
  const counterOptions = ledgers.filter((l) => l.ledgerType === (info.isBank ? 'BANK' : 'CASH'));
  const counter =
    counterOptions.find((c) => c.code === counterCode) ??
    counterOptions.find((c) => c.code === '000001') ?? // FoxPro: cashcode = [000001]
    counterOptions[0];
  const counterValue = counter?.code ?? '';

  const next = useNextVoucherNo(type, info.isBank ? counterValue : undefined, !editNo && (!info.isBank || !!counterValue));
  const nextDigits = next.data?.slice(2) ?? '';

  const ledgerByCode = useMemo(() => new Map(ledgers.map((l) => [l.code, l])), [ledgers]);
  const lineOptions = useMemo(() => ledgers.filter((l) => l.code !== counterValue), [ledgers, counterValue]);

  // Once the jobs load, give empty rows the default job
  useEffect(() => {
    if (defaultJob) setRows((rs) => rs.map((r) => (!r.accountCode && !r.jobCode ? { ...r, jobCode: defaultJob } : r)));
  }, [defaultJob]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
    setNotice('');
  };

  const resetForm = (keepMessages = false) => {
    setNumberInput('');
    setEditNo(null);
    setRows([blankRow(defaultJob)]);
    if (!keepMessages) clearMessages();
  };

  const changeType = (t: VoucherType) => {
    if (t === type) return;
    setType(t);
    setCounterCode('');
    resetForm();
  };

  const changeCounter = (code: string) => {
    setCounterCode(code);
    if (editNo || info.isBank) resetForm(); // cheque numbers are counted per bank
  };

  // FoxPro text1.Valid: pad to 5 digits, then open the voucher if it exists
  const openVoucher = async () => {
    const digits = numberInput.trim();
    if (!digits || editNo) return;
    clearMessages();
    if (!/^\d+$/.test(digits)) return setError('Voucher number must contain digits only.');
    if (info.isBank && !counterValue) return setError('Choose a bank first.');

    const padded = digits.padStart(5, '0');
    const voucherNo = type + padded;
    setNumberInput(padded);
    setOpening(true);
    try {
      const v = await getVoucher(voucherNo, info.isBank ? counterValue : undefined);
      setEditNo(v.voucherNo);
      setDate(v.date);
      setCounterCode(v.accountCode);
      setRows([
        ...v.lines.map((l) => ({
          key: nextKey++,
          accountCode: l.accountCode,
          amount: String(l.amount),
          remarks: l.remarks,
          jobCode: l.jobCode ?? '',
        })),
        blankRow(defaultJob),
      ]);
      setNotice(`Editing ${v.voucherNo}. Change anything and press Update.`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) setNotice(`${voucherNo} is a new voucher.`);
      else setError(apiErrorMessage(err));
    } finally {
      setOpening(false);
    }
  };

  // Update one row; keep one empty row at the bottom, like the FoxPro grid
  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => {
      const updated = rs.map((r) => (r.key === key ? { ...r, ...patch } : r));
      const last = updated[updated.length - 1];
      if (last.accountCode || last.amount) updated.push(blankRow(defaultJob));
      return updated;
    });

  const removeRow = (key: number) =>
    setRows((rs) => {
      const left = rs.filter((r) => r.key !== key);
      return left.length ? left : [blankRow(defaultJob)];
    });

  // Code column: type a code and leave the box → the account is picked
  const onCodeBlur = (row: Row) => {
    const raw = row.accountCode.trim();
    if (/^\d+$/.test(raw)) updateRow(row.key, { accountCode: raw.padStart(6, '0') });
  };

  const isFilled = (r: Row) => !!(r.accountCode || r.amount);
  const filled = rows.filter(isFilled);
  const total = filled.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const rowProblem = (r: Row) => {
    if (!isFilled(r)) return '';
    if (!ledgerByCode.has(r.accountCode)) return 'Choose a ledger';
    if (r.accountCode === counterValue) return `${counter?.name} is already on the other side`;
    if (!(Number(r.amount) > 0)) return 'Enter an amount above 0';
    return '';
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!counterValue) return setError(`Choose a ${info.isBank ? 'bank' : 'cash'} account.`);
    if (!filled.length) return setError('Add at least one line with an account and an amount.');
    const bad = filled.findIndex((r) => rowProblem(r));
    if (bad >= 0) return setError(`Line ${bad + 1}: ${rowProblem(filled[bad]).toLowerCase()}.`);

    mutate(
      {
        editNo,
        input: {
          type,
          number: editNo ? undefined : numberInput.trim() || undefined, // empty → next number
          date,
          accountCode: counterValue,
          lines: filled.map((r) => ({
            accountCode: r.accountCode,
            amount: Number(r.amount),
            remarks: r.remarks.trim(),
            jobCode: r.jobCode || null,
          })),
        },
      },
      {
        onSuccess: (res) => {
          setSuccess(res.message);
          resetForm(true);
        },
        onError: (err) => setError(apiErrorMessage(err, 'Could not save the voucher. Please try again.')),
      },
    );
  };

  // Debit / credit sides for the flow strip
  const linesSide = { label: 'Each line', sub: `${filled.length} account${filled.length === 1 ? '' : 's'}` };
  const counterSide = { label: counter?.name ?? (info.isBank ? 'Bank' : 'Cash'), sub: counter?.code ?? '' };
  const debitSide = info.isPayment ? linesSide : counterSide;
  const creditSide = info.isPayment ? counterSide : linesSide;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Accounts</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Voucher entry</h1>
        </div>
        {editNo && (
          <button
            type="button"
            onClick={() => resetForm()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" /> New voucher
          </button>
        )}
      </div>

      {/* ── Voucher type ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TYPES.map((t) => {
          const active = t.key === type;
          const Icon = t.isPayment ? ArrowUpRight : ArrowDownLeft;
          const Medium = t.isBank ? Landmark : Wallet;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => changeType(t.key)}
              disabled={!!editNo && !active}
              className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-200 hover:border-indigo-300'
                }`}
            >
              <div
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.isPayment ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                  }`}
              >
                <Medium className="h-5 w-5" />
                <Icon className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white p-0.5 shadow" />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${active ? 'text-indigo-900' : 'text-slate-900'}`}>
                  {t.label} <span className="font-normal text-slate-400">· {t.key}</span>
                </p>
                <p className="truncate text-xs text-slate-500">{t.hint}</p>
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-5 p-5">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {success}
            </div>
          )}
          {notice && (
            <div className="flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm text-indigo-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
            </div>
          )}
          {isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              Could not load accounts. Is the server running?
            </div>
          )}

          {/* ── Header: number, date, cash / bank ── */}
          <div className="grid gap-4 md:grid-cols-[210px_190px_1fr]">
            <div>
              <label htmlFor="vno" className="mb-1.5 block text-sm font-medium text-slate-700">
                Voucher No.
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
                  {type}
                </span>
                <input
                  id="vno"
                  inputMode="numeric"
                  value={numberInput}
                  disabled={!!editNo || opening}
                  onChange={(e) => setNumberInput(e.target.value.replace(/\D/g, ''))}
                  onBlur={openVoucher}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), openVoucher())}
                  placeholder={nextDigits ? `New: ${nextDigits}` : ''}
                  className={`${inputClass} rounded-l-none tabular-nums`}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">{opening ? 'Looking up…' : 'Type a number to open an old one'}</p>
            </div>

            <div>
              <label htmlFor="date" className="mb-1.5 block text-sm font-medium text-slate-700">
                Date
              </label>
              <input
                id="date"
                type="date"
                min={fy.min}
                max={fy.max}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">Within {fy.label}</p>
            </div>

            <div>
              <label htmlFor="counter" className="mb-1.5 block text-sm font-medium text-slate-700">
                {info.isBank ? 'Bank account' : 'Cash account'}
              </label>
              <select
                id="counter"
                value={counterValue}
                disabled={!!editNo || isLoading}
                onChange={(e) => changeCounter(e.target.value)}
                className={inputClass}
              >
                {counterOptions.length === 0 && <option value="">No {info.isBank ? 'bank' : 'cash'} ledgers yet</option>}
                {counterOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} · {c.code}
                  </option>
                ))}
              </select>
              {/* Debit → credit flow */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">
                  <b>Dr</b> {debitSide.label}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                  <b>Cr</b> {creditSide.label}
                </span>
              </div>
            </div>
          </div>

          {/* ── Lines ── */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="w-10 px-3 py-2.5">#</th>
                  <th className="w-24 px-3 py-2.5">Code</th>
                  <th className="px-3 py-2.5">Account</th>
                  <th className="px-3 py-2.5">Remarks</th>
                  <th className="w-52 px-3 py-2.5">Project</th>
                  <th className="w-40 px-3 py-2.5 text-right">Taka</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => {
                  const problem = rowProblem(row);
                  const isLast = i === rows.length - 1;
                  return (
                    <tr key={row.key} className={`group ${isLast && !isFilled(row) ? 'bg-slate-50/50' : ''}`}>
                      <td className="px-3 py-1.5 text-xs tabular-nums text-slate-400">{isLast && !isFilled(row) ? '+' : i + 1}</td>
                      <td className="px-1 py-1.5">
                        <input
                          aria-label={`Line ${i + 1} code`}
                          value={row.accountCode}
                          placeholder="Code"
                          onChange={(e) => updateRow(row.key, { accountCode: e.target.value.replace(/\D/g, '') })}
                          onBlur={() => onCodeBlur(row)}
                          className={`${cellClass} tabular-nums`}
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <AccountPicker
                          label={`Line ${i + 1} account`}
                          ledgers={lineOptions}
                          value={row.accountCode}
                          invalid={!!problem && problem.startsWith('Choose')}
                          onSelect={(l) => updateRow(row.key, { accountCode: l.code })}
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <input
                          aria-label={`Line ${i + 1} remarks`}
                          value={row.remarks}
                          placeholder={isFilled(row) ? 'Add a note' : ''}
                          onChange={(e) => updateRow(row.key, { remarks: e.target.value })}
                          className={cellClass}
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <select
                          aria-label={`Line ${i + 1} project`}
                          value={row.jobCode}
                          onChange={(e) => updateRow(row.key, { jobCode: e.target.value })}
                          className={`${cellClass} ${row.jobCode ? '' : 'text-slate-400'}`}
                        >
                          <option value="">No project</option>
                          {jobs.map((j) => (
                            <option key={j.code} value={j.code}>
                              {j.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1.5">
                        <input
                          aria-label={`Line ${i + 1} amount`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.amount}
                          placeholder="0.00"
                          onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                          className={`${cellClass} text-right font-medium tabular-nums ${problem.startsWith('Enter') ? 'border-red-300 bg-red-50/40' : ''
                            }`}
                        />
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {isFilled(row) && (
                          <button
                            type="button"
                            onClick={() => removeRow(row.key)}
                            aria-label={`Remove line ${i + 1}`}
                            className="rounded p-1.5 text-slate-300 transition group-hover:text-slate-400 hover:bg-red-50 hover:!text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td colSpan={5} className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Total · {filled.length} line{filled.length === 1 ? '' : 's'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-base font-semibold tabular-nums text-slate-900">{taka(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-4 text-sm text-slate-500">
            <p className="shrink-0">
              {editNo ? (
                <>
                  Editing <b className="text-slate-700">{editNo}</b>
                </>
              ) : (
                <>
                  Will be saved as{' '}
                  <b className="text-slate-700">{type + (numberInput ? numberInput.padStart(5, '0') : nextDigits || '…')}</b>
                </>
              )}
            </p>
            <p className="min-w-0 truncate" title={taka(total)}>
              Total <b className="text-base tabular-nums text-slate-900">{taka(total)}</b>
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={() => resetForm()}
              className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isPending || isLoading}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#4338ca] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3730a3] disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editNo ? 'Update voucher' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Account search box used in each line ──
// Colour per ledger type (codesign)
const TYPE_BADGE: Record<string, string> = {
  CASH: 'bg-emerald-50 text-emerald-700',
  BANK: 'bg-sky-50 text-sky-700',
  STORE: 'bg-amber-50 text-amber-700',
  PARTY: 'bg-violet-50 text-violet-700',
  PROJECT: 'bg-rose-50 text-rose-700',
};

const MAX_RESULTS = 60;

interface Props {
  ledgers: LedgerOption[];
  value: string; // selected ledger code
  onSelect: (ledger: LedgerOption) => void;
  invalid?: boolean;
  label: string;
}

// Searchable account box: type part of a name or a code, pick with mouse or keyboard
function AccountPicker({ ledgers, value, onSelect, invalid, label }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // The list floats above the page (position: fixed), so a scrolling table can't cut it off
  const openList = () => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  };

  // Close the list if the page scrolls, since it would no longer sit under the box
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (listRef.current?.contains(e.target as Node)) return; // scrolling inside the list is fine
      setOpen(false);
      setQuery('');
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const selected = ledgers.find((l) => l.code === value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? ledgers.filter(
        (l) => l.name.toLowerCase().includes(q) || l.code.startsWith(q) || l.groupName.toLowerCase().includes(q),
      )
      : ledgers;
    return list.slice(0, MAX_RESULTS);
  }, [ledgers, query]);

  const choose = (ledger: LedgerOption) => {
    onSelect(ledger);
    setOpen(false);
    setQuery('');
  };

  const moveTo = (index: number) => {
    setActive(index);
    listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      openList();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveTo(Math.min(active + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveTo(Math.max(active - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div>
      <div
        ref={boxRef}
        className={`flex h-9 items-center gap-2 rounded-md border px-2 transition ${open
            ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/10'
            : invalid
              ? 'border-red-300 bg-red-50/40'
              : 'border-transparent hover:border-slate-200'
          }`}
      >
        {open && <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        <input
          aria-label={label}
          role="combobox"
          aria-expanded={open}
          value={open ? query : (selected?.name ?? '')}
          placeholder={open ? 'Search by name, code or group…' : 'Choose an account'}
          onFocus={() => {
            openList();
            setActive(0);
          }}
          onBlur={() => {
            setOpen(false);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            if (!open) openList();
          }}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        {!open && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
      </div>

      {open && (
        <div
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-50 w-[26rem] max-w-[90vw] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No ledger matches "{query}"</p>
          ) : (
            <ul ref={listRef} role="listbox" className="max-h-72 overflow-y-auto py-1">
              {results.map((l, i) => (
                <li
                  key={l.code}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()} // keep focus so the click lands
                  onClick={() => choose(l)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? 'bg-indigo-50' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{l.name}</p>
                    <p className="truncate text-xs text-slate-500">{l.groupName || 'No sub group'}</p>
                  </div>
                  {TYPE_BADGE[l.ledgerType] && (
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${TYPE_BADGE[l.ledgerType]}`}>
                      {l.ledgerType.toLowerCase()}
                    </span>
                  )}
                  <span className="w-14 text-right text-xs tabular-nums text-slate-400">{l.code}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
            ↑ ↓ to move · Enter to pick · Esc to close
          </div>
        </div>
      )}
    </div>
  );
}
