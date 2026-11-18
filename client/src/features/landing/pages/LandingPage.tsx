import { Link } from 'react-router';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Boxes,
  CalendarRange,
  CheckCircle2,
  FileText,
  FolderKanban,
  Landmark,
  Receipt,
  Settings,
  ShieldCheck,
  Shirt,
  Warehouse,
} from 'lucide-react';

const FEATURES = [
  { icon: Receipt, title: 'Vouchers', text: 'Journal, payment, receipt and contra vouchers with posting and approval.' },
  { icon: BookOpen, title: 'Ledgers & Trial Balance', text: 'Double-entry accounting with instant ledgers and trial balance.' },
  { icon: BarChart3, title: 'Financial Reports', text: 'Profit & loss, balance sheet and cash flow for any period.' },
  { icon: FolderKanban, title: 'Project Costing', text: 'Track costs and expenses against each order or project.' },
  { icon: Warehouse, title: 'Godown Inventory', text: 'Stock across multiple godowns with item properties and returns.' },
  { icon: ShieldCheck, title: 'Users & Security', text: 'Role-based access so everyone sees only what they need.' },
];

const MODULES = [
  { icon: Landmark, title: 'Accounts', items: ['Chart of accounts', 'Vouchers', 'Ledger', 'Reports'] },
  { icon: FolderKanban, title: 'Projects', items: ['Project setup', 'Cost tracking', 'Project reports'] },
  { icon: Boxes, title: 'Inventory', items: ['Godowns', 'Items', 'Item properties', 'Returns'] },
  { icon: Settings, title: 'System', items: ['Users & roles', 'Company settings', 'Working year'] },
];

const LOCAL = [
  { icon: CalendarRange, text: 'Bangladesh fiscal year (July – June) built in' },
  { icon: FileText, text: 'Amounts in Taka (৳) with lakh/crore formatting' },
  { icon: Shirt, text: 'Designed around garments workflows: fabric, accessories, buyer advances' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7a1220] font-bold text-white">T</div>
            <span className="text-lg font-semibold">Technosoft</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-slate-900">Features</a>
            <a href="#modules" className="transition hover:text-slate-900">Modules</a>
            <a href="#about" className="transition hover:text-slate-900">About</a>
          </nav>
          <Link
            to="/login"
            className="rounded-lg bg-[#4338ca] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3730a3]"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#1e1b4b] text-white">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#7c7cf0] opacity-30 blur-3xl" />
        <div className="absolute -bottom-48 -left-32 h-[28rem] w-[28rem] rounded-full bg-[#7a1220] opacity-40 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 py-24 lg:grid-cols-2 lg:py-32">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-200">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b4b4ff]" />
              Accounts &amp; Inventory ERP
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Accounting software built for the garments industry.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-indigo-200">
              Manage vouchers, ledgers, projects and godown inventory in one secure system, now on the web.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#1e1b4b] shadow transition hover:bg-indigo-50"
              >
                Sign in to your account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Explore features
              </a>
            </div>
          </div>

          {/* Product preview (illustrative mock) */}
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur">
              <div className="overflow-hidden rounded-xl bg-white">
                <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex">
                  <div className="w-36 space-y-2 bg-[#1e1b4b] p-3">
                    <div className="h-2 w-16 rounded bg-white/40" />
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className={`h-6 rounded ${i === 1 ? 'bg-[#7c7cf0]/40' : 'bg-white/5'}`} />
                    ))}
                  </div>
                  <div className="flex-1 space-y-4 p-5">
                    <div className="h-3 w-32 rounded bg-slate-200" />
                    <div className="grid grid-cols-3 gap-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-3">
                          <div className="h-2 w-10 rounded bg-slate-200" />
                          <div className="h-3 w-16 rounded bg-slate-300" />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="h-2 w-12 rounded bg-slate-200" />
                          <div className="h-2 flex-1 rounded bg-slate-100" />
                          <div className="h-2 w-10 rounded bg-slate-200" />
                          <div className={`h-3 w-10 rounded-full ${i % 3 === 2 ? 'bg-amber-100' : 'bg-emerald-100'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="scroll-mt-16 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#4338ca]">Features</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything your accounts team needs
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              From daily vouchers to year-end reports, all your books in one place.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-200 p-6 transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-[#4338ca]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules ── */}
      <section id="modules" className="scroll-mt-16 bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#4338ca]">Modules</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Four modules, one system</h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map(({ icon: Icon, title, items }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e1b4b] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4338ca]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="scroll-mt-16 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#4338ca]">About</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Years of real-world use, rebuilt for today
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Technosoft started as a desktop system that has run a garments company's books for years. It has now
              been rebuilt as a modern web application, keeping the same proven workflows and making them faster,
              safer and accessible from anywhere.
            </p>
          </div>
          <div className="space-y-4">
            {LOCAL.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4 rounded-xl border border-slate-200 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#7a1220]/10 text-[#7a1220]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-700">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pb-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-[#1e1b4b] px-8 py-16 text-center text-white">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#7c7cf0] opacity-30 blur-3xl" />
          <h2 className="relative text-3xl font-semibold tracking-tight">Ready to get started?</h2>
          <p className="relative mx-auto mt-3 max-w-md text-indigo-200">
            Sign in with the credentials provided by your administrator.
          </p>
          <Link
            to="/login"
            className="relative mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#1e1b4b] transition hover:bg-indigo-50"
          >
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#7a1220] text-xs font-bold text-white">T</div>
            <span className="font-medium text-slate-700">Technosoft</span>
          </div>
          <p>© {new Date().getFullYear()} Technosoft. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
