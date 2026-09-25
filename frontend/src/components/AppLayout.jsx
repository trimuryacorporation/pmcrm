import { Bell, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { navItems } from '../data/modules.js';
import { endpoints } from '../utils/api.js';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(() => localStorage.getItem('trimurya_sidebar_open') !== 'false');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function toggleDesktopSidebar() {
    setDesktopSidebarOpen((current) => {
      localStorage.setItem('trimurya_sidebar_open', String(!current));
      return !current;
    });
  }

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      endpoints.globalSearch(query)
        .then((data) => setSearchResults(data.items || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 260);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  async function loadNotifications() {
    try {
      const data = await endpoints.list('notifications', { limit: 20 });
      setNotifications(data.items || []);
    } catch {
      setNotifications([]);
    }
  }

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(timer);
  }, []);

  function chooseSearchResult(result) {
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
    navigate(result.path);
  }

  async function openNotification(notification) {
    if (!notification.isRead) {
      try {
        await endpoints.update('notifications', notification._id, { isRead: true });
        setNotifications((items) => items.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
      } catch {
        // The notification can still be opened even if its read state cannot be saved.
      }
    }
    setNotificationsOpen(false);
    if (notification.link) navigate(notification.link);
  }

  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;
  const navigationSections = navItems
    .filter((item) => !item.roles || item.roles.includes(user?.role))
    .reduce((sections, item) => {
      const section = item.section || 'Menu';
      if (!sections[section]) sections[section] = [];
      sections[section].push(item);
      return sections;
    }, {});

  const sidebar = (
    <aside className="flex h-full w-72 flex-col bg-slate-950 text-white">
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <h1 className="font-semibold leading-tight">Enterprise CRM</h1>
        <button className="hidden rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white lg:inline-flex" onClick={toggleDesktopSidebar} aria-label="Close sidebar" title="Close sidebar"><PanelLeftClose className="h-4 w-4" /></button>
      </div>
      <nav className="sidebar-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 pr-2">
        {Object.entries(navigationSections).map(([section, items]) => <div key={section} className="pb-3 pt-1 first:pt-0">
          <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{section}</p>
          <div className="space-y-1">{items.map((item) => (
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
          ))}</div>
        </div>)}
      </nav>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <div className={`fixed inset-y-0 left-0 z-40 hidden transition-transform duration-300 lg:block ${desktopSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>{sidebar}</div>
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
      <main className={`transition-[padding] duration-300 ${desktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button className="rounded-lg border border-slate-200 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <button className="hidden rounded-lg border border-slate-200 p-2 lg:inline-flex" onClick={toggleDesktopSidebar} aria-label={desktopSidebarOpen ? 'Close sidebar' : 'Open sidebar'} title={desktopSidebarOpen ? 'Close sidebar' : 'Open sidebar'}>
              {desktopSidebarOpen ? <PanelLeftClose className="h-5 w-5 text-slate-600" /> : <PanelLeftOpen className="h-5 w-5 text-slate-600" />}
            </button>
            <div className="relative hidden min-w-0 flex-1 md:block">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100">
              <Search className="h-4 w-4 text-slate-400" />
                <input className="w-full bg-transparent text-sm outline-none" value={searchQuery} onFocus={() => setSearchOpen(true)} onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)} onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }} onKeyDown={(event) => { if (event.key === 'Enter' && searchResults[0]) chooseSearchResult(searchResults[0]); if (event.key === 'Escape') setSearchOpen(false); }} placeholder="Search projects, people, payments, invoices..." />
                {searching && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />}
              </div>
              {searchOpen && searchQuery.trim().length >= 2 && <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(28rem,calc(100vh-6rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {searchResults.length ? <><p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Search results</p>{searchResults.map((result) => <button key={`${result.type}-${result.id}`} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSearchResult(result)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-indigo-50"><span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{result.type}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{result.title}</span><span className="block truncate text-xs text-slate-500">{result.subtitle || 'Open record'}</span></span></button>)}</> : !searching && <p className="px-3 py-5 text-center text-sm text-slate-500">No records found for “{searchQuery}”.</p>}
              </div>}
            </div>
            <div className="relative">
              <button className="relative rounded-lg border border-slate-200 p-2 hover:bg-slate-50" onClick={() => { setNotificationsOpen((current) => !current); loadNotifications(); }} aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`} aria-expanded={notificationsOpen}>
                <Bell className="h-5 w-5 text-slate-600" />
                {unreadNotifications > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
              </button>
              {notificationsOpen && <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Notifications</h2><span className="text-xs text-slate-500">{unreadNotifications ? `${unreadNotifications} unread` : 'All caught up'}</span></div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length ? notifications.map((notification) => <button key={notification._id} type="button" onClick={() => openNotification(notification)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-indigo-50 ${notification.isRead ? 'bg-white' : 'bg-indigo-50/60'}`}>
                    <span className="block text-sm font-semibold text-slate-800">{notification.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-600">{notification.message || 'Open notification'}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{notification.createdAt ? new Date(notification.createdAt).toLocaleString('en-IN') : ''}</span>
                  </button>) : <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</p>}
                </div>
              </div>}
            </div>
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
