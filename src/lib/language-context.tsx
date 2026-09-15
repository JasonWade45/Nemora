"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { dict, type Dict, type Lang } from "./i18n";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Dict; dir: "rtl" | "ltr" };

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("nemora_lang")) as Lang | null;
    if (saved === "ar" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    localStorage.setItem("nemora_lang", lang);
  }, [lang]);

  function setLang(l: Lang) { setLangState(l); }

  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: dict[lang], dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}