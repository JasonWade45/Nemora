'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function AdminLayout({ children, title, subtitle, headerActions, breadcrumbs }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <Header 
          title={title} 
          subtitle={subtitle} 
          actions={headerActions}
          breadcrumbs={breadcrumbs}
        />
        
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}