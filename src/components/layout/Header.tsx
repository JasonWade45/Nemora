'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Bell, Search, Settings, LogOut, ChevronDown,
  Sun, Moon, Building2, User, HelpCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarGroup } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function Header({ title, subtitle, actions, breadcrumbs }: HeaderProps) {
  const { user, company, logout } = useAuth();
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const notifications: Array<{ id: string; title: string; message: string; time: string; read: boolean }> = [];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="hidden md:flex items-center gap-2 text-sm" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href || index} className="flex items-center gap-2">
                {index > 0 && <ChevronDown className="w-4 h-4 text-slate-400" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="text-slate-500 hover:text-slate-700">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-900 font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Page Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg lg:text-xl font-semibold text-slate-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 truncate">{subtitle}</p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search doctors, reps, visits..."
              className="w-64 pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500 focus:border-transparent"
              aria-label="Search"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors touch-target"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={notificationsOpen}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 animate-slide-up">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">Notifications</h3>
                    <Button variant="ghost" size="sm" onClick={() => setNotificationsOpen(false)}>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500">No notifications yet</div>
                    ) : notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3 border-b border-slate-100 ${!notif.read ? 'bg-pharma-50' : ''}`}
                      >
                        <p className="font-medium text-slate-900 text-sm">{notif.title}</p>
                        <p className="text-slate-600 text-sm mt-0.5">{notif.message}</p>
                        <p className="text-slate-400 text-xs mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-slate-200">
                    <Link href="/notifications" className="text-sm text-pharma-600 hover:text-pharma-700 font-medium">
                      View all notifications
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors touch-target"
              aria-expanded={userMenuOpen}
              aria-label="User menu"
            >
              <Avatar name={user?.name} size="sm" />
              <span className="hidden sm:block text-sm font-medium text-slate-700">{user?.name}</span>
              <ChevronDown className="w-4 h-4 text-slate-500 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 animate-slide-up">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <p className="font-medium text-slate-900">{user?.name}</p>
                    <p className="text-sm text-slate-500 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
                    <p className="text-xs text-slate-400 mt-1">{company?.name}</p>
                  </div>
                  <nav className="py-2">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <Link
                      href="/help"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <HelpCircle className="w-4 h-4" />
                      Help & Support
                    </Link>
                  </nav>
                  <div className="border-t border-slate-200">
                    <button
                      onClick={logout}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}