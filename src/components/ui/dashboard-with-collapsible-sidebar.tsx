'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, MapPin, Calendar, Clock, MessageCircle,
  Package, Target, FileText, Settings, Building2, LogOut, Menu, X, Pill,
  ChevronLeft, ChevronRight, Bell, CheckCircle, TrendingUp, Star
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from '@/lib/use-translations';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';

const REP_NAV_ITEMS = [
  { href: '/rep', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/rep/my-doctors', labelKey: 'myDoctors', icon: Users },
  { href: '/rep/nearby', labelKey: 'nearbyDoctors', icon: MapPin },
  { href: '/rep/visits', labelKey: 'visits', icon: Calendar },
  { href: '/rep/follow-ups', labelKey: 'followUps', icon: Clock },
  { href: '/rep/schedule', labelKey: 'schedule', icon: Calendar },
  { href: '/rep/orders', labelKey: 'orders', icon: Package },
];

const MANAGER_ADMIN_NAV_ITEMS = [
  { href: '/manager', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/manager/team', labelKey: 'team', icon: Users },
  { href: '/manager/map', labelKey: 'liveMap', icon: MapPin },
  { href: '/manager/visits', labelKey: 'visits', icon: Calendar },
  { href: '/manager/reports', labelKey: 'reports', icon: FileText },
  { href: '/manager/targets', labelKey: 'targets', icon: Target },
  { href: '/manager/doctors', labelKey: 'doctors', icon: Users },
];

const ADMIN_EXTRA_ITEMS = [
  { href: '/admin/employees', labelKey: 'employees', icon: Users },
  { href: '/admin/products', labelKey: 'products', icon: Package },
  { href: '/admin/settings', labelKey: 'settings', icon: Settings },
];

interface DashboardWithCollapsibleSidebarProps {
  children: React.ReactNode;
  stats?: {
    visitsToday: number;
    myDoctors: number;
    pendingFollowUps: number;
    targetAchievement: number;
  };
  title: string;
  subtitle?: string;
}

export function DashboardWithCollapsibleSidebar({
  children,
  stats = { visitsToday: 0, myDoctors: 0, pendingFollowUps: 0, targetAchievement: 0 },
  title,
  subtitle,
}: DashboardWithCollapsibleSidebarProps) {
  const { user, logout, company } = useAuth();
  const pathname = usePathname();
  const t = useTranslations();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isRep = user?.role === 'MEDICAL_REP';
  const isManager = user?.role === 'MANAGER';
  const isAdmin = user?.role === 'ADMIN';

  const navItems = isRep 
    ? REP_NAV_ITEMS 
    : [...MANAGER_ADMIN_NAV_ITEMS, ...(isAdmin ? ADMIN_EXTRA_ITEMS : [])];

  const basePath = isRep ? '/rep' : '/manager';

  return (
    <div className="min-h-screen bg-slate-50 flex">
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
          fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
          transition-all duration-300 ease-in-out flex flex-col
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className={`
          flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-700
          ${isCollapsed ? 'justify-center' : ''}
        `}>
          {!isCollapsed ? (
            <Link href={basePath} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-blue-700 flex items-center justify-center">
                <Pill className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {company?.name || t.appName}
              </span>
            </Link>
          ) : (
            <Link href={basePath} className="flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-blue-700 flex items-center justify-center">
                <Pill className="w-5 h-5 text-white" />
              </div>
            </Link>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
              p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200
              lg:hidden ${isCollapsed ? 'ml-auto' : 'ml-2'}
            `}
            aria-label={isCollapsed ? t.openMenu : t.closeMenu}
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

        {/* Footer */}
        <div className={`p-4 border-t border-slate-200 dark:border-slate-700 ${isCollapsed ? 'items-center' : ''}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <Avatar name={user?.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {user?.role === 'ADMIN' ? 'ادمن' : user?.role === 'MANAGER' ? 'مدير' : 'مندوب مبيعات'}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
          <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
            <button
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              onClick={() => setMobileOpen(true)}
              aria-label={t.openMenu}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page Title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg lg:text-xl font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h1>
              {subtitle && (
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
              )}
            </div>

            {/* Notifications */}
            <div className="hidden md:flex items-center gap-2">
              <div className="relative">
                <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <Avatar name={user?.name} size="sm" />
                <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300">{user?.name}</span>
                <ChevronDown className="w-4 h-4 text-slate-500 hidden sm:block" />
              </button>
            </div>
          </div>
        </header>

        {/* Stat Cards */}
        <div className="px-4 py-4 lg:px-6 lg:py-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto mb-6">
            <StatCard
              label={t.visits}
              value={stats.visitsToday}
              target={8}
              icon={MapPin}
              color="text-teal-600"
              bg="bg-teal-100 dark:bg-teal-900/30"
              iconColor="text-teal-600"
            />
            <StatCard
              label={t.myDoctors}
              value={stats.myDoctors}
              target={15}
              icon={Users}
              color="text-success-600"
              bg="bg-success-100 dark:bg-success-900/30"
              iconColor="text-success-600"
            />
            <StatCard
              label={t.followUps}
              value={stats.pendingFollowUps}
              target={5}
              icon={Clock}
              color="text-warning-600"
              bg="bg-warning-100 dark:bg-warning-900/30"
              iconColor="text-warning-600"
            />
            <StatCard
              label="الإنجاز"
              value={stats.targetAchievement}
              target={100}
              icon={TrendingUp}
              color="text-purple-600"
              bg="bg-purple-100 dark:bg-purple-900/30"
              iconColor="text-purple-600"
              suffix="%"
            />
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-auto max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed bottom-6 right-4 z-50 p-3 bg-gradient-to-br from-teal-600 to-blue-700 text-white rounded-full shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all duration-300"
        onClick={() => setMobileOpen(true)}
        aria-label={t.openMenu}
      >
        <Menu className="w-6 h-6" />
      </button>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  target: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  iconColor: string;
  suffix?: string;
}

function StatCard({ label, value, target, icon: Icon, color, bg, iconColor, suffix }: StatCardProps) {
  const percentage = Math.min((value / target) * 100, 100);
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {value}/{target}{suffix || ''}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}{suffix || ''}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${color.replace('text-', 'bg-')}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default DashboardWithCollapsibleSidebar;