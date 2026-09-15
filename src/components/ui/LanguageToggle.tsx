"use client";

import { useLanguage } from "@/lib/language-context";
import { useState, useRef, useEffect } from "react";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = lang === "ar" ? "AR" : "EN";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition text-sm font-medium"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="tabular-nums">{current}</span>
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-40 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
          <button
            onClick={() => { setLang("ar"); setOpen(false); }}
            className={`w-full text-start px-4 py-2.5 text-sm transition ${lang === "ar" ? "bg-sky-50 text-sky-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
          >
            العربية
          </button>
          <button
            onClick={() => { setLang("en"); setOpen(false); }}
            className={`w-full text-start px-4 py-2.5 text-sm transition ${lang === "en" ? "bg-sky-50 text-sky-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
          >
            English
          </button>
        </div>
      )}
    </div>
  );
}