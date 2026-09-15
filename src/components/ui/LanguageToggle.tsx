"use client";

import { useLanguage } from "@/lib/language-context";
import { Globe } from "lucide-react";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, toggle } = useLanguage();

  if (compact) {
    return (
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        title={lang === "ar" ? "English" : "العربية"}
      >
        <span className="text-[11px] font-bold">{lang === "ar" ? "EN" : "ع"}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
    >
      <span className="flex items-center gap-2">
        <Globe className="w-4 h-4" />
        <span>{lang === "ar" ? "English" : "العربية"}</span>
      </span>
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
        {lang === "ar" ? "AR" : "EN"}
      </span>
    </button>
  );
}