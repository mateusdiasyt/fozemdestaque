"use client";

const LANGUAGES = [
  { code: "pt", label: "Português (BR)", flag: "br" },
  { code: "en", label: "English (US)", flag: "us" },
  { code: "es", label: "Español (AR)", flag: "ar" },
  { code: "es", label: "Español (PY)", flag: "py" },
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
  return (
    <div className="flex items-center gap-0.5">
      {LANGUAGES.map((lang, i) => (
        <button
          key={`${lang.code}-${lang.flag}-${i}`}
          type="button"
          onClick={() => setGoogleTranslate(lang.code)}
          className="p-0.5 hover:opacity-80 transition-opacity"
          title={lang.label}
          aria-label={lang.label}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://flagcdn.com/24x18/${lang.flag}.png`}
            alt=""
            className="h-4 w-auto block"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
}
