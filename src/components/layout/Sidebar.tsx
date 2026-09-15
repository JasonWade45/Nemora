'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, UserPlus, MapPin, Target, 
  Settings, Building2, LogOut, Menu, X, ChevronDown,
  Building, Package, FileText, Bell, HelpCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

const ADMIN_NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/admin/my-reps', label: 'مندوبيني', icon: UserPlus },
  { href: '/admin/visits', label: 'زيارات الفريق', icon: MapPin },
  { href: '/admin/doctors', label: 'الأطباء', icon: Users },
  { href: '/admin/products', label: 'المنتجات', icon: Package },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
];

const MANAGER_NAV_ITEMS = [
  { href: '/manager/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/manager/team', label: 'الفريق كامل', icon: Users },
  { href: '/manager/admins', label: 'المشرفين', icon: UserPlus },
  { href: '/manager/visits', label: 'كل الزيارات', icon: MapPin },
  { href: '/manager/doctors', label: 'الأطباء', icon: Building },
  { href: '/manager/products', label: 'المنتجات', icon: Package },
  { href: '/manager/targets', label: 'الأهداف', icon: Target },
  { href: '/manager/reports', label: 'التقارير', icon: FileText },
];

export function Sidebar() {
  const { user, logout, company } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems = user?.role === 'ADMIN' ? ADMIN_NAV_ITEMS : MANAGER_NAV_ITEMS;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200
          transition-all duration-300 ease-in-out flex flex-col
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className={`
          flex items-center justify-between h-16 px-4 border-b border-slate-200
          ${isCollapsed ? 'justify-center' : ''}
        `}>
          {!isCollapsed && (
            <Link href={user?.role === 'ADMIN' ? '/admin/dashboard' : '/manager/dashboard'} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pharma-600 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-slate-900 truncate">{company?.name || 'PharmaCRM'}</span>
            </Link>
          )}
          {isCollapsed && (
            <Link href={user?.role === 'ADMIN' ? '/admin/dashboard' : '/manager/dashboard'} className="flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg bg-pharma-600 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            </Link>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
              p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700
              lg:hidden ${isCollapsed ? 'ml-auto' : 'ml-2'}
            `}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-pharma-50 text-pharma-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`
          p-4 border-t border-slate-200
          ${isCollapsed ? 'items-center' : ''}
        `}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <Avatar name={user?.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
              </div>
            </div>
          ) : (
            <Avatar name={user?.name} size="sm" />
          )}

          {!isCollapsed && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed bottom-6 right-4 z-50 p-3 bg-pharma-600 text-white rounded-full shadow-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>
    </>
  );
}