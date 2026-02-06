"use client";

import { useState, useRef, useEffect } from "react";

const LANGUAGES = [
  { code: "pt", label: "Português (BR)", flag: "🇧🇷" },
  { code: "en", label: "English (US)", flag: "🇺🇸" },
  { code: "es", label: "Español (AR)", flag: "🇦🇷" },
  { code: "es", label: "Español (PY)", flag: "🇵🇾" },
] as const;

const SOURCE_LANG = "pt";

function setGoogleTranslate(lang: string) {
  if (lang === SOURCE_LANG) {
    document.cookie = "googtrans=; path=/; max-age=0";
  } else {
    document.cookie = `googtrans=/${SOURCE_LANG}/${lang}; path=/`;
  }
  window.location.reload();
}

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex items-center gap-0.5" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 p-1.5 text-white/80 hover:text-white hover:opacity-100 opacity-80 transition-opacity"
        aria-label="Selecionar idioma"
        aria-expanded={open}
      >
        <span className="text-base leading-none" aria-hidden>🌐</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 py-2 bg-white rounded-lg shadow-lg border border-[#e8ebed] z-50 min-w-[200px]">
          <p className="px-4 py-2 text-xs font-medium text-[#859eac] uppercase tracking-wide border-b border-[#e8ebed]">
            Traduzir site
          </p>
          {LANGUAGES.map((lang, i) => (
            <button
              key={`${lang.code}-${lang.flag}-${i}`}
              type="button"
              onClick={() => {
                setGoogleTranslate(lang.code);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-[#4e5b60] hover:text-[#ff751f] hover:bg-[#f8f9fa] transition-colors"
            >
              <span className="text-xl">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
