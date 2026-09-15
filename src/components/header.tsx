'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, Search, Settings, LogOut, ChevronDown, HelpCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from '@/lib/use-translations';
import { useLocale } from '@/lib/locale-context';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function Header({ title, subtitle, actions, breadcrumbs }: HeaderProps) {
  const { user, company, logout } = useAuth();
  const t = useTranslations();
  const { locale } = useLocale();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const notifications: Array<{ id: string; title: string; message: string; time: string; read: boolean }> = [];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="hidden md:flex items-center gap-2 text-sm" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href || index} className="flex items-center gap-2">
                {index > 0 && <ChevronDown className="w-4 h-4 text-slate-400" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-900 dark:text-slate-100 font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-lg lg:text-xl font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
        </div>

        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}

        <div className="hidden md:flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder={t.searchDoctorsReps}
              className="w-64 pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              aria-label={t.search}
            />
          </div>

          <LanguageToggle />
          <ThemeToggle />

          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label={t.notifications}
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
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50 animate-slide-up">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t.notifications}</h3>
                    <Button variant="ghost" size="sm" onClick={() => setNotificationsOpen(false)}>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                        {locale === 'ar' ? 'لا توجد إشعارات حالياً' : 'No notifications yet'}
                      </div>
                    ) : notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3 border-b border-slate-100 dark:border-slate-700 ${!notif.read ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}
                      >
                        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{notif.title}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">{notif.message}</p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-expanded={userMenuOpen}
              aria-label={t.userMenu}
            >
              <Avatar name={user?.name} size="sm" />
              <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300">{user?.name}</span>
              <ChevronDown className="w-4 h-4 text-slate-500 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50 animate-slide-up">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{user?.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                      {user?.role?.toLowerCase().replace('_', ' ')}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{company?.name}</p>
                  </div>
                  <nav className="py-2">
                    <Link
                      href="/admin/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      {t.settingsLabel}
                    </Link>
                    <Link
                      href="/admin/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <HelpCircle className="w-4 h-4" />
                      {t.helpSupport}
                    </Link>
                  </nav>
                  <div className="border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={logout}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                    >
                      <LogOut className="w-4 h-4" />
                      {t.signOut}
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
