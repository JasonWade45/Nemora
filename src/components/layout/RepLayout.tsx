'use client';

import React from 'react';
import { Header } from './Header';
import { BottomNav, RepFab } from './BottomNav';

interface RepLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  showBottomNav?: boolean;
}

export function RepLayout({ 
  children, 
  title, 
  subtitle, 
  headerActions, 
  showBottomNav = true 
}: RepLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-safe">
      <Header 
        title={title} 
        subtitle={subtitle} 
        actions={headerActions}
      />
      
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">
        <div className="px-4 py-4 lg:px-6 lg:py-6 max-w-2xl mx-auto w-full">
          {children}
        </div>
      </main>

      {showBottomNav && (
        <>
          <BottomNav />
          <RepFab />
        </>
      )}
    </div>
  );
}