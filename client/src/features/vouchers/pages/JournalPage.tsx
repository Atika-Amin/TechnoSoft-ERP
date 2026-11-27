import { useEffect, useMemo, useState, type FormEvent } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle2, Info, Loader2, Plus, Save, Scale, Trash2 } from 'lucide-react';
import { getJournal } from '../api/vouchers.api';
import { useNextJournalNo, useSaveJournal, useVoucherSetup } from '../hooks/useVouchers';
import { AccountPicker } from './VoucherPage';
import { apiErrorMessage } from '../../../lib/axios';

// One grid row of the journal (FoxPro grid: Code · Particulars · Debit Tk. · Credit Tk. · Project · Remarks)
interface Row {
  key: number;
  accountCode: string;
  debit: string; // kept as text while typing
  credit: string;
  remarks: string;
  jobCode: string; // '' = none
}

let nextKey = 1;
const blankRow = (jobCode: string): Row => ({ key: nextKey++, accountCode: '', debit: '', credit: '', remarks: '', jobCode });

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const taka = (n: number) => '৳ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cents = (v: string) => Math.round((Number(v) || 0) * 100);
const showDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

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

export default function JournalPage() {
  const { data: setup, isLoading, isError } = useVoucherSetup();
  const { mutate, isPending } = useSaveJournal();
  const ledgers = useMemo(() => setup?.ledgers ?? [], [setup]);
  const jobs = setup?.jobs ?? [];
  const defaultJob = jobs.find((j) => j.isDefault)?.code ?? '';

  const [numberInput, setNumberInput] = useState('');
  const [editNo, setEditNo] = useState<string | null>(null); // journal being edited, null = new
  const [date, setDate] = useState(defaultDate);
  const [rows, setRows] = useState<Row[]>(() => [blankRow(''), blankRow('')]);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notice, setNotice] = useState('');

  const fy = fiscalRange();
  const dateOk = date >= fy.min && date <= fy.max;
  const next = useNextJournalNo(date, !editNo && dateOk);
  const nextDigits = next.data?.slice(2) ?? '';

  const ledgerByCode = useMemo(() => new Map(ledgers.map((l) => [l.code, l])), [ledgers]);

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
    setRows([blankRow(defaultJob), blankRow(defaultJob)]);
    if (!keepMessages) clearMessages();
  };

  // FoxPro text1.Valid + jvtxt: number (padded to 5) + date → open the journal if it exists
  const openJournal = async () => {
    const digits = numberInput.trim();
    if (!digits || editNo) return;
    clearMessages();
    if (!/^\d+$/.test(digits)) return setError('Voucher number must contain digits only.');
    if (!dateOk) return setError('Date is not in the working year.');

    const padded = digits.padStart(5, '0');
    const voucherNo = 'JR' + padded;
    setNumberInput(padded);
    setOpening(true);
    try {
      const j = await getJournal(voucherNo, date);
      setEditNo(j.voucherNo);
      setRows([
        ...j.lines.map((l) => ({
          key: nextKey++,
          accountCode: l.accountCode,
          debit: l.debit ? String(l.debit) : '',
          credit: l.credit ? String(l.credit) : '',
          remarks: l.remarks,
          jobCode: l.jobCode ?? '',
        })),
        blankRow(defaultJob),
      ]);
      setNotice(`Editing ${j.voucherNo} of ${showDate(j.date)}. Change anything and press Update.`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) setNotice(`${voucherNo} on ${showDate(date)} is a new journal.`);
      else setError(apiErrorMessage(err));
    } finally {
      setOpening(false);
    }
  };

  // Update one row; keep one empty row at the bottom
  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => {
      const updated = rs.map((r) => (r.key === key ? { ...r, ...patch } : r));
      const last = updated[updated.length - 1];
      if (last.accountCode || last.debit || last.credit) updated.push(blankRow(defaultJob));
      return updated;
    });

  const removeRow = (key: number) =>
    setRows((rs) => {
      const left = rs.filter((r) => r.key !== key);
      return left.length ? left : [blankRow(defaultJob)];
    });

  const onCodeBlur = (row: Row) => {
    const raw = row.accountCode.trim();
    if (/^\d+$/.test(raw)) updateRow(row.key, { accountCode: raw.padStart(6, '0') });
  };

  // ── Totals and checks ──
  const isFilled = (r: Row) => !!(r.accountCode || r.debit || r.credit);
  const filled = rows.filter(isFilled);
  const debitLines = filled.filter((r) => cents(r.debit) > 0);
  const creditLines = filled.filter((r) => cents(r.credit) > 0);
  const totalDebit = debitLines.reduce((s, r) => s + cents(r.debit), 0) / 100;
  const totalCredit = creditLines.reduce((s, r) => s + cents(r.credit), 0) / 100;
  const difference = Math.round((totalDebit - totalCredit) * 100) / 100;
  const balanced = totalDebit > 0 && difference === 0;
  const manyToMany = debitLines.length > 1 && creditLines.length > 1;

  const rowProblem = (r: Row) => {
    if (!isFilled(r)) return '';
    if (!ledgerByCode.has(r.accountCode)) return 'Choose a ledger';
    if ((cents(r.debit) > 0) === (cents(r.credit) > 0)) return 'Enter a debit or a credit amount';
    return '';
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!dateOk) return setError('Date is not in the working year.');
    if (!filled.length) return setError('Add the debit and credit lines first.');
    const bad = filled.findIndex((r) => rowProblem(r));
    if (bad >= 0) return setError(`Line ${bad + 1}: ${rowProblem(filled[bad]).toLowerCase()}.`);
    if (!debitLines.length || !creditLines.length) return setError('A journal needs at least one debit line and one credit line.');
    if (!balanced) return setError(`Debit and credit totals differ by ${taka(Math.abs(difference))}.`);
    if (manyToMany) return setError('One side must have a single account: one debit with several credits, or several debits with one credit.');

    mutate(
      {
        editNo,
        input: {
          number: editNo ? undefined : numberInput.trim() || undefined, // empty → next number for that date
          date,
          lines: filled.map((r) => ({
            accountCode: r.accountCode,
            debit: Number(r.debit) || 0,
            credit: Number(r.credit) || 0,
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
        onError: (err) => setError(apiErrorMessage(err, 'Could not save the journal. Please try again.')),
      },
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Accounts</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Journal voucher</h1>
        </div>
        {editNo && (
          <button
            type="button"
            onClick={() => resetForm()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" /> New journal
          </button>
        )}
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

          {/* ── Header: date, number ── */}
          <div className="grid gap-4 md:grid-cols-[190px_210px_1fr]">
            <div>
              <label htmlFor="jdate" className="mb-1.5 block text-sm font-medium text-slate-700">
                Date
              </label>
              <input
                id="jdate"
                type="date"
                min={fy.min}
                max={fy.max}
                value={date}
                disabled={!!editNo}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClass} ${dateOk ? '' : 'border-red-300'}`}
              />
              <p className={`mt-1 text-xs ${dateOk ? 'text-slate-500' : 'text-red-600'}`}>
                {dateOk ? `Within ${fy.label}` : `Date is not in ${fy.label}`}
              </p>
            </div>

            <div>
              <label htmlFor="jno" className="mb-1.5 block text-sm font-medium text-slate-700">
                Voucher No.
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
                  JR
                </span>
                <input
                  id="jno"
                  inputMode="numeric"
                  value={numberInput}
                  disabled={!!editNo || opening}
                  onChange={(e) => setNumberInput(e.target.value.replace(/\D/g, ''))}
                  onBlur={openJournal}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), openJournal())}
                  placeholder={nextDigits ? `New: ${nextDigits}` : ''}
                  className={`${inputClass} rounded-l-none tabular-nums`}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">{opening ? 'Looking up…' : 'Numbers restart each day'}</p>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <Scale className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p>
                Put each account on its own line with either a <b>debit</b> or a <b>credit</b>. One side must have a single
                account, for example several debits against one supplier. Save is possible once both totals match.
              </p>
            </div>
          </div>

          {/* ── Lines ── */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="w-10 px-3 py-2.5">#</th>
                  <th className="w-24 px-3 py-2.5">Code</th>
                  <th className="px-3 py-2.5">Account</th>
                  <th className="px-3 py-2.5">Remarks</th>
                  <th className="w-48 px-3 py-2.5">Project</th>
                  <th className="w-36 px-3 py-2.5 text-right">Debit</th>
                  <th className="w-36 px-3 py-2.5 text-right">Credit</th>
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
                          ledgers={ledgers}
                          value={row.accountCode}
                          invalid={problem === 'Choose a ledger'}
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
                          aria-label={`Line ${i + 1} debit`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.debit}
                          placeholder="0.00"
                          onChange={(e) => updateRow(row.key, { debit: e.target.value, credit: e.target.value ? '' : row.credit })}
                          className={`${cellClass} text-right font-medium tabular-nums ${
                            problem.startsWith('Enter') ? 'border-red-300 bg-red-50/40' : ''
                          }`}
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <input
                          aria-label={`Line ${i + 1} credit`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.credit}
                          placeholder="0.00"
                          onChange={(e) => updateRow(row.key, { credit: e.target.value, debit: e.target.value ? '' : row.debit })}
                          className={`${cellClass} text-right font-medium tabular-nums ${
                            problem.startsWith('Enter') ? 'border-red-300 bg-red-50/40' : ''
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
                    Totals
                  </td>
                  <td className="truncate px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{taka(totalDebit)}</td>
                  <td className="truncate px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{taka(totalCredit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
            <p className="shrink-0">
              {editNo ? (
                <>
                  Editing <b className="text-slate-700">{editNo}</b> of {showDate(date)}
                </>
              ) : (
                <>
                  Will be saved as{' '}
                  <b className="text-slate-700">JR{numberInput ? numberInput.padStart(5, '0') : nextDigits || '…'}</b> on{' '}
                  {showDate(date)}
                </>
              )}
            </p>
            {filled.length > 0 &&
              (manyToMany ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" /> One side needs a single account
                </span>
              ) : balanced ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Balanced
                </span>
              ) : (
                <span
                  className="inline-flex min-w-0 items-center gap-1.5 truncate rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
                  title={taka(Math.abs(difference))}
                >
                  <Scale className="h-3.5 w-3.5 shrink-0" /> {difference > 0 ? 'Debit' : 'Credit'} is more by{' '}
                  {taka(Math.abs(difference))}
                </span>
              ))}
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
              disabled={isPending || isLoading || !balanced || manyToMany}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#4338ca] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3730a3] disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editNo ? 'Update journal' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
