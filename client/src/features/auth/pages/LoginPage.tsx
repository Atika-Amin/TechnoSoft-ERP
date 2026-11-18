import { useState, type FormEvent } from 'react';
import type { AxiosError } from 'axios';
import { Link } from 'react-router';
import {
  AlertCircle,
  BarChart3,
  CalendarRange,
  Eye,
  EyeOff,
  FolderKanban,
  Loader2,
  Lock,
  ShieldCheck,
  User,
  Warehouse,
} from 'lucide-react';
import { useLogin } from '../hooks/useLogin';

// Bangladesh fiscal year: July → June
function getFiscalYears(count = 6) {
  const now = new Date();
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: count }, (_, i) => `${start - i}-${start - i + 1}`);
}

const FEATURES = [
  { icon: BarChart3, title: 'Accounts', text: 'Vouchers, ledgers and financial reports' },
  { icon: FolderKanban, title: 'Projects', text: 'Track costs and progress per order' },
  { icon: Warehouse, title: 'Inventory', text: 'Godowns, items and stock movement' },
];

export default function LoginPage() {
  const years = getFiscalYears();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [workingYear, setWorkingYear] = useState(years[0]);
  const [showPassword, setShowPassword] = useState(false);
  const { mutate, isPending, error } = useLogin();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    mutate({ username: username.trim(), password, workingYear });
  };

  const rawMessage = (error as AxiosError<{ message?: string | string[] }> | null)?.response?.data?.message;
  const errorMessage = error
    ? (Array.isArray(rawMessage) ? rawMessage[0] : rawMessage) ?? 'Unable to sign in. Please check your credentials.'
    : null;

  const inputClass =
    'h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

  return (
    <div className="flex min-h-screen bg-white font-sans antialiased">
      {/* ── Brand panel ── */}
      <aside className="relative hidden w-1/2 overflow-hidden bg-[#1e1b4b] lg:flex">
        {/* grid pattern (a nod to the original FoxPro form) */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#7c7cf0] opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-[#7a1220] opacity-40 blur-3xl" />

        <div className="relative z-10 flex w-full flex-col justify-between p-12 text-white">
          <Link to="/" className="flex w-fit items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7a1220] text-lg font-bold shadow-lg">
              T
            </div>
            <div>
              <p className="text-lg font-semibold leading-tight">Technosoft</p>
              <p className="text-xs text-indigo-200">Accounts &amp; Inventory ERP</p>
            </div>
          </Link>

          <div className="max-w-md">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              Manage your business finances with confidence.
            </h1>
            <p className="mt-4 text-base text-indigo-200">
              One place for your company's accounts, projects and inventory.
            </p>

            <div className="mt-10 space-y-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#7c7cf0]/20 text-[#b4b4ff]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-sm text-indigo-200">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-indigo-300">© {new Date().getFullYear()} Technosoft. All rights reserved.</p>
        </div>
      </aside>

      {/* ── Form panel ── */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-10 flex w-fit items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7a1220] text-lg font-bold text-white">
              T
            </div>
            <p className="text-lg font-semibold text-slate-900">Technosoft</p>
          </Link>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Enter your credentials to access your account.</p>

          {errorMessage && (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-700">
                Username
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="username"
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="workingYear" className="mb-1.5 block text-sm font-medium text-slate-700">
                Working year
              </label>
              <div className="relative">
                <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  id="workingYear"
                  value={workingYear}
                  onChange={(e) => setWorkingYear(e.target.value)}
                  className={`${inputClass} appearance-none`}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      FY {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || !username.trim() || !password}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#4338ca] text-sm font-semibold text-white shadow-sm transition hover:bg-[#3730a3] focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Forgot your password? Contact your system administrator.
          </p>

          <div className="mt-12 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure, encrypted connection
          </div>
        </div>
      </main>
    </div>
  );
}
