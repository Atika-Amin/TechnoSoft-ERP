import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  BookOpen,
  Boxes,
  Calculator,
  ListTree,
  Undo2,
  CalendarRange,
  FileText,
  FolderKanban,
  Home,
  LogOut,
  Menu,
  PieChart,
  Receipt,
  Search,
  Settings,
  Tags,
  Users,
  Warehouse,
  X,
} from 'lucide-react';

// Each section = one left button in the FoxPro menu (frommain value).
// Each item = one of the top buttons (godo / propr / item / command5 / mretu) for that mode.
const NAV = [
  { section: null, items: [{ to: '/home', label: 'Home', icon: Home }] },
  {
    section: 'Accounts', // frommain = 1
    items: [
      { to: '/accounts/journal', label: 'Journal', icon: FileText }, // command5
      { to: '/accounts/chart', label: 'Chart', icon: BookOpen }, // godo
      { to: '/accounts/vouchers', label: 'Voucher', icon: Receipt }, // propr → ventry
      { to: '/accounts/reports', label: 'Reports', icon: PieChart }, // item
      { to: '/accounts/returns', label: 'Return', icon: Undo2 }, // mretu
    ],
  },
  {
    section: 'Projects', // frommain = 3
    items: [
      { to: '/projects', label: 'Project', icon: FolderKanban }, // godo
      { to: '/projects/up-heads', label: 'Up Heads', icon: ListTree }, // item
      { to: '/projects/valuation', label: 'Valuation', icon: Calculator }, // propr → prjcteval
    ],
  },
  {
    section: 'Inventory',
    items: [
      { to: '/inventory/godowns', label: 'Godowns', icon: Warehouse },
      { to: '/inventory/items', label: 'Items', icon: Boxes },
      { to: '/inventory/item-properties', label: 'Item Properties', icon: Tags },
    ],
  },
  {
    section: 'System',
    items: [
      { to: '/system/users', label: 'Users', icon: Users },
      { to: '/system/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function getUser(): { fullName: string; role: string } {
  try {
    return JSON.parse(localStorage.getItem('user') ?? '') ?? { fullName: 'User', role: '' };
  } catch {
    return { fullName: 'User', role: '' };
  }
}

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const user = getUser();
  const workingYear = localStorage.getItem('workingYear') ?? '';
  const initials = user.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => setSidebarOpen(false), [location.pathname]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('workingYear');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased">
      {/* mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#1e1b4b] text-indigo-100 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7a1220] font-bold text-white">T</div>
            <div>
              <p className="text-sm font-semibold text-white">Technosoft</p>
              <p className="text-[11px] text-indigo-300">Accounts &amp; Inventory</p>
            </div>
          </div>
          <button className="text-indigo-300 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV.map((group, i) => (
            <div key={i}>
              {group.section && (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                  {group.section}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                        isActive
                          ? 'bg-[#7c7cf0]/20 font-medium text-white'
                          : 'text-indigo-200 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-indigo-200 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-8">
          <button className="text-slate-500 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden max-w-sm flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search accounts, vouchers, items…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div className="ml-auto flex items-center gap-4">
            {workingYear && (
              <span className="hidden items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 sm:flex">
                <CalendarRange className="h-3.5 w-3.5" />
                FY {workingYear}
              </span>
            )}
            <span className="hidden text-sm tabular-nums text-slate-500 md:block">
              {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4338ca] text-xs font-semibold text-white">
                {initials || 'U'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium leading-tight text-slate-900">{user.fullName}</p>
                <p className="text-xs text-slate-500">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
