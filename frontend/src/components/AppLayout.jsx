import { Bell, LogOut, Menu, Search, ShieldCheck, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { navItems } from '../data/modules.js';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const sidebar = (
    <aside className="flex h-full w-72 flex-col bg-slate-950 text-white">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 font-bold">TC</div>
          <div>
            <p className="text-sm text-slate-300">Trimurya Corporation</p>
            <h1 className="font-semibold leading-tight">Enterprise CRM</h1>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.filter((item) => !item.roles || item.roles.includes(user?.role)).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="rounded-lg bg-white/10 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-blue-300" />
            Role access enabled
          </div>
          <p className="mt-1 text-xs text-slate-300">JWT protected workspace for {user?.role?.replace('_', ' ')}.</p>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="relative h-full">
            {sidebar}
            <button className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white" onClick={() => setOpen(false)} aria-label="Close sidebar">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button className="rounded-lg border border-slate-200 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <input className="w-full bg-transparent text-sm outline-none" placeholder="Search projects, vendors, invoices..." />
            </div>
            <button className="rounded-lg border border-slate-200 p-2" aria-label="Notifications">
              <Bell className="h-5 w-5 text-slate-600" />
            </button>
            <button onClick={() => navigate('/profile')} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <UserRound className="h-4 w-4 text-indigo-600" />
              <span className="hidden text-sm font-semibold sm:inline">{user?.name}</span>
            </button>
            <button onClick={logout} className="rounded-lg border border-slate-200 p-2" aria-label="Logout">
              <LogOut className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </header>
        <section className="p-4 sm:p-6">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
