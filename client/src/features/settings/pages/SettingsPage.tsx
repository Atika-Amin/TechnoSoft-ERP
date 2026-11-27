import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import { getCompany, saveCompany, type Company } from '../api/company.api';
import { apiErrorMessage } from '../../../lib/axios';

const EMPTY: Company = { name: '', address1: '', address2: '', address3: '', nature: '', phone: '' };

const FIELDS: { key: keyof Company; label: string; hint?: string }[] = [
  { key: 'name', label: 'Company name', hint: 'Printed at the top of every report' },
  { key: 'nature', label: 'Type of business', hint: 'e.g. Construction, Garments' },
  { key: 'address1', label: 'Address line 1' },
  { key: 'address2', label: 'Address line 2' },
  { key: 'address3', label: 'Address line 3' },
  { key: 'phone', label: 'Phone' },
];

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

// System → Settings: company details (old "profile" table)
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['company'], queryFn: getCompany });
  const [form, setForm] = useState<Company>(EMPTY);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: saveCompany,
    onSuccess: (saved) => {
      queryClient.setQueryData(['company'], saved);
      setMessage('Company details saved.');
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!form.name.trim()) return setError('Company name is required.');
    save.mutate(form);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-slate-500">System</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Company details</h2>
          <p className="text-sm text-slate-500">Used on report headings and printouts.</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.key === 'name' ? 'sm:col-span-2' : ''}>
              <label htmlFor={`company-${f.key}`} className="mb-1.5 block text-sm font-medium text-slate-700">
                {f.label}
              </label>
              <input
                id={`company-${f.key}`}
                value={form[f.key]}
                disabled={isLoading}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className={inputClass}
              />
              {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <p className="text-sm">
            {message && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> {message}
              </span>
            )}
            {error && <span className="text-red-600">{error}</span>}
          </p>
          <button
            type="submit"
            disabled={save.isPending || isLoading}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#4338ca] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3730a3] disabled:opacity-50"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
