'use client';

import { useLocale } from '@/lib/locale-context';
import { Globe } from 'lucide-react';

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-700 ${className}`}
      aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
      <span className="text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'EN' : 'AR'}</span>
    </button>
  );
}
