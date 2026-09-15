"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Lang = "ar" | "en";

type LanguageContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  dir: "rtl" | "ltr";
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  setLang: () => {},
  toggle: () => {},
  dir: "rtl",
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem("nemora_lang") as Lang) || "ar";
    setLangState(saved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem("nemora_lang", lang);
  }, [lang, mounted]);

  function setLang(l: Lang) {
    setLangState(l);
  }

  function toggle() {
    setLangState((prev) => (prev === "ar" ? "en" : "ar"));
  }

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        toggle,
        dir: lang === "ar" ? "rtl" : "ltr",
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}