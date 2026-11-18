import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, FolderTree, Loader2, Plus, Save } from 'lucide-react';
import type { Account, AccountInput, LedgerType, Level, Nature, Statement } from '../api/chart.api';
import { useAccounts, useSaveAccount } from '../hooks/useChart';
import { apiErrorMessage } from '../../../lib/axios';

const TABS: { key: Level; label: string; nameLabel: string; parentLevel: Level | null; parentLabel: string }[] = [
  { key: 'GROUP', label: 'Group', nameLabel: 'Group name', parentLevel: null, parentLabel: '' },
  { key: 'SUBGROUP', label: 'Sub Group', nameLabel: 'Sub group name', parentLevel: 'GROUP', parentLabel: 'Under group' },
  { key: 'LEDGER', label: 'Ledger', nameLabel: 'Ledger name', parentLevel: 'SUBGROUP', parentLabel: 'Under sub group' },
];

const LABEL: Record<Level, string> = { GROUP: 'group', SUBGROUP: 'sub group', LEDGER: 'ledger' };

const NATURES: { key: Nature; label: string }[] = [
  { key: 'ASSETS', label: 'Assets' },
  { key: 'LIABILITY', label: 'Liability' },
  { key: 'INCOME', label: 'Income' },
  { key: 'EXPENSE', label: 'Expense' },
];

// FoxPro tmpa: only one can be ticked
const STATEMENTS: { key: Statement | null; label: string }[] = [
  { key: null, label: 'None' },
  { key: 'TRADING', label: 'Trading A/C' },
  { key: 'MANUFACTURING', label: 'Manufacturing A/C' },
  { key: 'PROFIT_LOSS', label: 'Profit / Loss A/C' },
  { key: 'APPROPRIATION', label: 'P/L Appropriation A/C' },
];

// FoxPro codesign order: 1 Cash, 2 Bank, 3 Store, 4 Party, 5 None, 6 Project
const LEDGER_TYPES: { key: LedgerType; label: string }[] = [
  { key: 'CASH', label: 'Cash' },
  { key: 'BANK', label: 'Bank' },
  { key: 'STORE', label: 'Store' },
  { key: 'PARTY', label: 'Party' },
  { key: 'NONE', label: 'None' },
  { key: 'PROJECT', label: 'Project' },
];

// What each nature allows (FoxPro optiongroup2, option1-4):
// Assets / Liability → balance sheet only, no "Exist into"
// Income / Expense   → must pick one statement (default Profit / Loss), and no Bank, Store or Party
const NATURE_RULES: Record<Nature, { needsStatement: boolean; blockedTypes: LedgerType[] }> = {
  ASSETS: { needsStatement: false, blockedTypes: [] },
  LIABILITY: { needsStatement: false, blockedTypes: [] },
  INCOME: { needsStatement: true, blockedTypes: ['BANK', 'STORE', 'PARTY'] },
  EXPENSE: { needsStatement: true, blockedTypes: ['BANK', 'STORE', 'PARTY'] },
};

const emptyForm = (level: Level): AccountInput => ({
  name: '',
  level,
  parentCode: null,
  nature: 'ASSETS',
  statement: null,
  ledgerType: 'NONE',
  openingBalance: 0,
  remarks1: '',
  remarks2: '',
});

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:text-slate-500';

export default function ChartOfAccountsPage() {
  const { data: accounts = [], isLoading, isError } = useAccounts();
  const { mutate, isPending } = useSaveAccount();

  const [tab, setTab] = useState<Level>('GROUP');
  const [form, setForm] = useState<AccountInput>(emptyForm('GROUP'));
  const [editCode, setEditCode] = useState<string | null>(null); // code being edited, null = new
  const [codeInput, setCodeInput] = useState('');
  const [locked, setLocked] = useState(false); // FoxPro "Miss Match !" → form disabled
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const tabInfo = TABS.find((t) => t.key === tab)!;
  const nextCode = String(Math.max(100000, ...accounts.map((a) => Number(a.code) || 0)) + 1).padStart(6, '0');
  const parentOptions = accounts.filter((a) => a.level === tabInfo.parentLevel);
  const parent = accounts.find((a) => a.code === form.parentCode);

  // A ledger copies nature, "exist into" and ledger type from its sub group (FoxPro option3)
  const isLedger = tab === 'LEDGER';
  const eff = isLedger
    ? { nature: parent?.nature, statement: parent?.statement ?? null, ledgerType: parent?.ledgerType }
    : { nature: form.nature, statement: form.statement, ledgerType: form.ledgerType };
  const optionsDisabled = isLedger || locked;
  const statementRule = eff.nature ? NATURE_RULES[eff.nature].needsStatement : false;

  const set = <K extends keyof AccountInput>(key: K, value: AccountInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchTab = (level: Level) => {
    setTab(level);
    setForm(emptyForm(level));
    setEditCode(null);
    setCodeInput('');
    setLocked(false);
    resetMessages();
  };

  const loadAccount = (a: Account) => {
    const { code, projectCode: _projectCode, ...rest } = a;
    setTab(a.level);
    setForm(rest);
    setEditCode(code);
    setCodeInput(code);
    setLocked(false);
    resetMessages();
  };

  // FoxPro text1.Valid: pad to 6 digits, load if it exists, "Miss Match !" if it's on another tab
  const checkCode = () => {
    if (editCode) return;
    const raw = codeInput.trim();
    setLocked(false);
    resetMessages();
    if (!raw) return;
    if (!/^\d+$/.test(raw)) return setError('Code must contain digits only.');

    const code = raw.padStart(6, '0');
    setCodeInput(code);
    const found = accounts.find((a) => a.code === code);
    if (!found) return; // new code → fill in the form
    if (found.level === tab) return loadAccount(found);

    setLocked(true);
    setError(
      `Mismatch: code ${code} is the ${LABEL[found.level]} "${found.name}". Open the ${
        TABS.find((t) => t.key === found.level)!.label
      } tab to edit it, or type another code.`,
    );
  };

  // Choosing a group for a sub group fills in its settings (they can still be changed)
  const changeParent = (code: string) => {
    const p = accounts.find((a) => a.code === code);
    if (tab === 'SUBGROUP' && p) {
      setForm((f) => ({ ...f, parentCode: code, nature: p.nature, statement: p.statement, ledgerType: p.ledgerType }));
    } else {
      set('parentCode', code || null);
    }
  };

  // Picking a nature applies its rules straight away
  const changeNature = (nature: Nature) => {
    const rule = NATURE_RULES[nature];
    setForm((f) => ({
      ...f,
      nature,
      statement: rule.needsStatement ? (f.statement ?? 'PROFIT_LOSS') : null,
      ledgerType: rule.blockedTypes.includes(f.ledgerType) ? 'NONE' : f.ledgerType,
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (locked) return;

    // Quick checks in the browser; the server checks the same rules again
    const name = form.name.trim();
    if (!name) return setError(`${tabInfo.nameLabel} is required.`);
    if (tabInfo.parentLevel && !parent) return setError(`Please select ${tabInfo.parentLabel.toLowerCase()}.`);
    const duplicate = accounts.some(
      (a) => a.level === tab && a.code !== editCode && a.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) return setError(`A ${LABEL[tab]} named "${name}" already exists.`);

    const account: AccountInput = {
      ...form,
      name,
      parentCode: tabInfo.parentLevel ? form.parentCode : null,
      nature: eff.nature!,
      statement: eff.statement,
      ledgerType: eff.ledgerType!,
      code: editCode ? undefined : codeInput.trim() || undefined, // empty → server picks the next code
    };

    mutate(
      { account, editCode },
      {
        onSuccess: (saved) => {
          setSuccess(
            `${tabInfo.label} "${saved.name}" saved with code ${saved.code}.` +
              (saved.createdProjectCode ? ` Project job ${saved.createdProjectCode} was created for it.` : ''),
          );
          setForm(emptyForm(tab));
          setEditCode(null);
          setCodeInput('');
        },
        onError: (err) => setError(apiErrorMessage(err, 'Could not save. Please try again.')),
      },
    );
  };

  const groups = accounts.filter((a) => a.level === 'GROUP');
  const childrenOf = (code: string) => accounts.filter((a) => a.parentCode === code);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm text-slate-500">Accounts</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Chart of Accounts</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => switchTab(t.key)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                    tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {(editCode || locked) && (
              <button
                type="button"
                onClick={() => switchTab(tab)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4338ca] hover:underline"
              >
                <Plus className="h-4 w-4" /> New {LABEL[tab]}
              </button>
            )}
          </div>

          <div className="space-y-6 p-5">
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

            {/* Code / name */}
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <div>
                <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Code
                </label>
                <input
                  id="code"
                  inputMode="numeric"
                  value={codeInput}
                  disabled={!!editCode}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                  onBlur={checkCode}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), checkCode())}
                  placeholder={`Auto: ${nextCode}`}
                  className={`${inputClass} tabular-nums`}
                />
                {!editCode && <p className="mt-1 text-xs text-slate-500">Type a code to open it, or leave empty</p>}
              </div>
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
                  {tabInfo.nameLabel}
                </label>
                <input
                  id="name"
                  value={form.name}
                  disabled={locked}
                  onChange={(e) => set('name', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Parent + opening balance */}
            {tabInfo.parentLevel && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="parent" className="mb-1.5 block text-sm font-medium text-slate-700">
                    {tabInfo.parentLabel}
                  </label>
                  <select
                    id="parent"
                    value={form.parentCode ?? ''}
                    disabled={locked}
                    onChange={(e) => changeParent(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    {parentOptions.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
                {isLedger && (
                  <div>
                    <label htmlFor="opening" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Opening balance (৳)
                    </label>
                    <input
                      id="opening"
                      type="number"
                      step="0.01"
                      disabled={locked}
                      value={form.openingBalance}
                      onChange={(e) => set('openingBalance', Number(e.target.value))}
                      className={`${inputClass} text-right tabular-nums`}
                    />
                    <p className="mt-1 text-xs text-slate-500">Positive = Debit, negative = Credit</p>
                  </div>
                )}
              </div>
            )}

            {isLedger && (
              <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                A ledger takes its nature, statement and ledger type from its sub group.
              </p>
            )}

            {/* Nature + statement */}
            <div className="grid gap-6 md:grid-cols-2">
              <fieldset disabled={optionsDisabled}>
                <legend className="mb-2 text-sm font-medium text-slate-700">Nature of ledger</legend>
                <div className="grid grid-cols-2 gap-2">
                  {NATURES.map((n) => (
                    <label
                      key={n.key}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                        eff.nature === n.key ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-700'
                      } ${optionsDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-indigo-300'}`}
                    >
                      <input
                        type="radio"
                        name="nature"
                        checked={eff.nature === n.key}
                        onChange={() => changeNature(n.key)}
                        className="accent-[#4338ca]"
                      />
                      {n.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset disabled={optionsDisabled || !statementRule}>
                <legend className="mb-2 text-sm font-medium text-slate-700">
                  Exist into the{' '}
                  {!statementRule && eff.nature && (
                    <span className="font-normal text-slate-400">(not used for balance-sheet accounts)</span>
                  )}
                </legend>
                <div className="space-y-1.5">
                  {STATEMENTS.filter((s) => (statementRule ? s.key !== null : s.key === null)).map((s) => (
                    <label
                      key={s.label}
                      className={`flex items-center gap-2 text-sm text-slate-700 ${
                        optionsDisabled || !statementRule ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="statement"
                        checked={eff.statement === s.key}
                        onChange={() => set('statement', s.key)}
                        className="h-4 w-4 accent-[#4338ca]"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {/* Ledger type (codesign) */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Ledger type</p>
              <div className="flex flex-wrap gap-2">
                {LEDGER_TYPES.map((t) => {
                  const blocked = !!eff.nature && NATURE_RULES[eff.nature].blockedTypes.includes(t.key);
                  const active = eff.ledgerType === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      disabled={optionsDisabled || blocked}
                      onClick={() => set('ledgerType', t.key)}
                      title={blocked ? `Not allowed for ${eff.nature!.toLowerCase()} accounts` : undefined}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed ${
                        active
                          ? 'border-[#4338ca] bg-[#4338ca] text-white'
                          : 'border-slate-200 text-slate-600 enabled:hover:border-indigo-300'
                      } ${blocked ? 'line-through opacity-40' : ''} ${optionsDisabled && !active ? 'opacity-60' : ''}`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              {eff.ledgerType === 'PROJECT' && isLedger && (
                <p className="mt-2 text-xs text-slate-500">Saving this ledger also creates a project job for it.</p>
              )}
            </div>

            {/* Remarks */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rem1" className="mb-1.5 block text-sm font-medium text-slate-700">Remarks 1</label>
                <input id="rem1" disabled={locked} value={form.remarks1} onChange={(e) => set('remarks1', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="rem2" className="mb-1.5 block text-sm font-medium text-slate-700">Remarks 2</label>
                <input id="rem2" disabled={locked} value={form.remarks2} onChange={(e) => set('remarks2', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={() => switchTab(tab)}
              className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isPending || locked}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#4338ca] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3730a3] disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editCode ? 'Update' : 'Save'}
            </button>
          </div>
        </form>

        {/* ── Account tree ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <FolderTree className="h-4 w-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">Account tree</h2>
          </div>
          <div className="max-h-[680px] overflow-y-auto p-3">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : isError ? (
              <p className="py-10 text-center text-sm text-red-600">Could not load accounts. Is the server running?</p>
            ) : groups.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No accounts yet. Start by adding a group.</p>
            ) : (
              groups.map((g) => (
                <div key={g.code} className="mb-1">
                  <TreeRow account={g} depth={0} active={editCode === g.code} onClick={loadAccount} />
                  {childrenOf(g.code).map((sg) => (
                    <div key={sg.code}>
                      <TreeRow account={sg} depth={1} active={editCode === sg.code} onClick={loadAccount} />
                      {childrenOf(sg.code).map((l) => (
                        <TreeRow key={l.code} account={l} depth={2} active={editCode === l.code} onClick={loadAccount} />
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TreeRow({
  account,
  depth,
  active,
  onClick,
}: {
  account: Account;
  depth: number;
  active: boolean;
  onClick: (a: Account) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(account)}
      style={{ paddingLeft: 12 + depth * 20 }}
      className={`flex w-full items-center gap-2 rounded-md py-1.5 pr-3 text-left text-sm transition ${
        active ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      {depth < 2 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : <span className="w-3.5" />}
      <span className={`flex-1 truncate ${depth === 0 ? 'font-semibold' : ''}`}>{account.name}</span>
      {account.projectCode && (
        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Job {account.projectCode}</span>
      )}
      <span className="text-xs tabular-nums text-slate-400">{account.code}</span>
    </button>
  );
}
