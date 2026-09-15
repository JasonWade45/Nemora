'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, MapPin,
  Settings, Building2, LogOut, Menu, X, Package,
  FileText, Stethoscope
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from '@/lib/use-translations';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';

const ADMIN_NAV_ITEMS = [
  { href: '/admin', labelKey: 'dashboard' as const, icon: LayoutDashboard },
  { href: '/admin/employees', labelKey: 'employees' as const, icon: Users },
  { href: '/admin/doctors', labelKey: 'doctors' as const, icon: Stethoscope },
  { href: '/admin/products', labelKey: 'products' as const, icon: Package },
  { href: '/admin/reports', labelKey: 'reports' as const, icon: FileText },
  { href: '/admin/settings', labelKey: 'settings' as const, icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = '' }: SidebarProps) {
  const { user, logout, company } = useAuth();
  const pathname = usePathname();
  const t = useTranslations();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
          transition-all duration-300 ease-in-out flex flex-col
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${className}
        `}
        aria-label="Admin navigation"
      >
        <div className={`
          flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-700
          ${isCollapsed ? 'justify-center' : ''}
        `}>
          {!isCollapsed ? (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-blue-700 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {company?.name || t.appName}
              </span>
            </Link>
          ) : (
            <Link href="/admin" className="flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-blue-700 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            </Link>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
              p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200
              lg:hidden ${isCollapsed ? 'ml-auto' : 'ml-2'}
            `}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Admin menu">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-r-2 border-teal-600 dark:border-teal-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'}
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? t[item.labelKey] : undefined}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {!isCollapsed && <span className="truncate">{t[item.labelKey]}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 border-t border-slate-200 dark:border-slate-700 ${isCollapsed ? 'items-center' : ''}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <Avatar name={user?.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {user?.role?.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <Avatar name={user?.name} size="sm" />
            </div>
          )}

          {!isCollapsed && (
            <>
              <div className="flex items-center gap-1 mt-3">
                <LanguageToggle className="flex-1" />
                <ThemeToggle className="flex-1" />
              </div>
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t.signOut}</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>

      <button
        className="lg:hidden fixed bottom-6 right-4 z-50 p-3 bg-gradient-to-br from-teal-600 to-blue-700 text-white rounded-full shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all duration-300"
        onClick={() => setMobileOpen(true)}
        aria-label={t.openMenu}
      >
        <Menu className="w-6 h-6" />
      </button>
    </>
  );
}
