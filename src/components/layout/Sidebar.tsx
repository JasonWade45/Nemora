'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, UserPlus, MapPin, Target,
  Settings, LogOut, Menu, X, Building2, Package,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useLanguage } from '@/lib/language-context';
import { clearToken, getToken } from '@/lib/api';

const ADMIN_NAV_ITEMS = [
  { href: '/admin', labelAr: 'لوحة التحكم', labelEn: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/my-reps', labelAr: 'مندوبيني', labelEn: 'My Reps', icon: UserPlus },
  { href: '/admin/visits', labelAr: 'زيارات الفريق', labelEn: 'Team Visits', icon: MapPin },
  { href: '/admin/sales', labelAr: 'المبيعات', labelEn: 'Sales', icon: Package },
  { href: '/admin/analytics', labelAr: 'التحليلات', labelEn: 'Analytics', icon: Target },
  { href: '/admin/doctors', labelAr: 'الأطباء', labelEn: 'Doctors', icon: Users },
  { href: '/admin/products', labelAr: 'المنتجات', labelEn: 'Products', icon: Package },
  { href: '/admin/settings', labelAr: 'الإعدادات', labelEn: 'Settings', icon: Settings },
];

const MANAGER_NAV_ITEMS = [
  { href: '/manager', labelAr: 'لوحة التحكم', labelEn: 'Dashboard', icon: LayoutDashboard },
  { href: '/manager/team', labelAr: 'الفريق كامل', labelEn: 'Full Team', icon: Users },
  { href: '/manager/visits', labelAr: 'كل الزيارات', labelEn: 'All Visits', icon: MapPin },
  { href: '/manager/sales', labelAr: 'المبيعات', labelEn: 'Sales', icon: Package },
  { href: '/manager/analytics', labelAr: 'التحليلات', labelEn: 'Analytics', icon: Target },
  { href: '/manager/products', labelAr: 'المنتجات', labelEn: 'Products', icon: Package },
];

type SidebarProps = {
  role: 'ADMIN' | 'MANAGER';
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useLanguage();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems = role === 'ADMIN' ? ADMIN_NAV_ITEMS : MANAGER_NAV_ITEMS;
  const isAr = lang === 'ar';

  function logout() {
    clearToken();
    router.push('/login');
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 start-0 z-50
          bg-slate-900 dark:bg-slate-950 border-e border-slate-800
          transition-all duration-300 ease-in-out flex flex-col
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 rtl:translate-x-full rtl:lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b border-slate-800`}>
          {!isCollapsed && (
            <Link href={role === 'ADMIN' ? '/admin' : '/manager'} className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/30">
                <span className="text-white text-sm font-bold">N</span>
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-sm truncate tracking-tight">NEMORA</div>
                <div className="text-[9px] text-slate-400 truncate">
                  {isAr ? 'إدارة الفريق' : 'Field Force'}
                </div>
              </div>
            </Link>
          )}
          {isCollapsed && (
            <Link href={role === 'ADMIN' ? '/admin' : '/manager'} className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center">
              <span className="text-white text-sm font-bold">N</span>
            </Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white hidden lg:flex ${isCollapsed ? 'ms-0' : ''}`}
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href));
            const label = isAr ? item.labelAr : item.labelEn;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? label : undefined}
              >
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-sky-400' : ''}`} style={{ width: 18, height: 18 }} />
                {!isCollapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {!isCollapsed && (
            <div className="space-y-1">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          )}

          {isCollapsed && (
            <div className="flex flex-col items-center gap-1">
              <ThemeToggle compact />
              <LanguageToggle compact />
            </div>
          )}

          <button
            onClick={logout}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>{isAr ? 'تسجيل خروج' : 'Sign out'}</span>}
          </button>
        </div>
      </aside>

      <button
        className="lg:hidden fixed bottom-6 end-4 z-50 p-3 bg-sky-500 text-white rounded-full shadow-lg"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-6 h-6" />
      </button>
    </>
  );
}