'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, MapPin, Calendar, User, Plus, LogOut,
  Bell, Settings, CheckCircle, Clock, Users
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/Badge';

const REP_NAV_ITEMS = [
  { href: '/rep', label: 'Home', icon: Home, badge: null },
  { href: '/rep/nearby', label: 'Map', icon: MapPin, badge: null },
  { href: '/rep/my-doctors', label: 'My Doctors', icon: Users, badge: null },
  { href: '/rep/schedule', label: 'Schedule', icon: Calendar, badge: null },
  { href: '/rep/profile', label: 'Profile', icon: User, badge: null },
];

export function BottomNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Only show on mobile
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-area-bottom" role="navigation" aria-label="Bottom navigation">
      <div className="grid grid-cols-5">
        {REP_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-1 px-2 py-3
                touch-target transition-colors
                ${isActive
                  ? 'text-pharma-600 bg-pharma-50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className="w-6 h-6" aria-hidden="true" />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Floating action button for quick actions
export function RepFab() {
  const pathname = usePathname();
  
  // Don't show on certain pages
  if (pathname === '/rep/visits/active' || pathname.startsWith('/rep/visits/start')) {
    return null;
  }

  return (
    <Link
      href="/rep/visits/start"
      className="lg:hidden fixed bottom-24 right-4 z-40 p-4 bg-pharma-600 text-white rounded-full shadow-lg touch-target"
      aria-label="Start new visit"
    >
      <Plus className="w-6 h-6" />
    </Link>
  );
}