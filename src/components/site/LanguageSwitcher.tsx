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
    <div className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1">
      {LANGUAGES.map((lang, i) => (
        <button
          key={`${lang.code}-${lang.flag}-${i}`}
          type="button"
          onClick={() => setGoogleTranslate(lang.code)}
          className="p-1 hover:scale-110 transition-transform"
          title={lang.label}
          aria-label={lang.label}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://flagcdn.com/32x24/${lang.flag}.png`}
            alt=""
            className="h-5 w-auto block"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
}
