import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, ShieldCheck, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../services/api';
import type { NotificationItem } from '../types';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    notificationsApi
      .list()
      .then((res) => {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      })
      .catch(() => null);
  }, [user]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  const isInternshipQuery =
    location.pathname === '/opportunities' &&
    new URLSearchParams(location.search).get('type') === 'Internship';

  const makeLinkClass = (active: boolean) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 border-b-2 ${
      active
        ? 'text-slate-900 border-blue-700'
        : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
    }`;

  const linkClass = ({ isActive }: { isActive: boolean }) => makeLinkClass(isActive);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single line, no subtitle or badge) */}
        <Link
          to="/"
          className="font-display text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
        >
          OpenTrack
        </Link>

        {/* Zone 2: 4-5 concise single-line text links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-6">
          <NavLink
            to="/opportunities"
            className={({ isActive }) => makeLinkClass(isActive && !isInternshipQuery)}
          >
            Discover
          </NavLink>
          <NavLink
            to="/opportunities?type=Internship"
            className={({ isActive }) => makeLinkClass(isActive && isInternshipQuery)}
          >
            Internships
          </NavLink>
          <NavLink to="/submit" className={linkClass}>
            Submit Role
          </NavLink>
          <NavLink to="/dashboard" className={linkClass}>
            Dashboard
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {!user ? (
            <Link
              to="/login"
              className="hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          ) : (
            <div ref={dropdownRef} className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span className="truncate max-w-[140px]">{user.name}</span>
                {unreadCount > 0 && (
                  <span className="text-xs font-mono tabular-nums text-blue-700 font-semibold">
                    ({unreadCount})
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {user.email} · {user.role === 'admin' ? 'Administrator' : 'Member'}
                    </p>
                  </div>

                  <div className="p-2 border-b border-slate-100">
                    <Link
                      to="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
                    >
                      <UserIcon className="h-4 w-4 text-slate-500" />
                      My Career Dashboard
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
                      >
                        <ShieldCheck className="h-4 w-4 text-blue-700" />
                        Admin Moderation Panel
                      </Link>
                    )}
                  </div>

                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-slate-500" />
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs text-blue-700 hover:underline font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 py-1">No notifications yet.</p>
                    ) : (
                      <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                        {notifications.slice(0, 4).map((item) => (
                          <li key={item._id}>
                            <Link
                              to={item.link || '/dashboard'}
                              onClick={() => setMenuOpen(false)}
                              className={`block text-xs p-2 rounded-lg transition-colors ${
                                item.read
                                  ? 'text-slate-600 hover:bg-white'
                                  : 'bg-blue-50/80 text-slate-900 font-medium hover:bg-blue-100/60'
                              }`}
                            >
                              {item.message}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center p-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          <Link
            to="/opportunities"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Discover Opportunities
          </Link>
          <Link
            to="/opportunities?type=Internship"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Internships
          </Link>
          <Link
            to="/submit"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Submit Role
          </Link>
          <Link
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Dashboard
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-lg"
            >
              Admin Panel
            </Link>
          )}
          <div className="pt-2 border-t border-slate-200">
            {!user ? (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg"
              >
                Sign In
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg"
              >
                Sign Out ({user.name})
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
