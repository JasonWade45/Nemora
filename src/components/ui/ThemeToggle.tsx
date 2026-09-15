"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className={compact ? "w-9 h-9" : "w-full h-10"} />
    );
  }

  const isDark = theme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");

  if (compact) {
    return (
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition"
        title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition"
    >
      <span className="flex items-center gap-2">
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        <span>{isDark ? "الوضع الفاتح" : "الوضع الداكن"}</span>
      </span>
      <span className="w-8 h-4 rounded-full bg-slate-700 relative">
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
            isDark ? "start-4 rtl:start-auto rtl:end-4" : "start-0.5"
          }`}
        />
      </span>
    </button>
  );
}