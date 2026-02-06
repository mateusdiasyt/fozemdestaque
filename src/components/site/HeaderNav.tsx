"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Menu, X, ChevronDown, MoreHorizontal } from "lucide-react";
import { VisitCounter } from "@/components/site/VisitCounter";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { MAIN_NAV_ITEMS, MENU_ITEMS } from "@/lib/menu-items";

interface PreviewPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
}

export function HeaderNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<PreviewPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname === "/busca") setQ(searchParams.get("q") ?? "");
  }, [pathname, searchParams]);

  useEffect(() => {
    const t = q.trim().length >= 2
      ? setTimeout(async () => {
          setLoading(true);
          try {
            const res = await fetch(`/api/posts?q=${encodeURIComponent(q.trim())}&limit=5`);
            const data = await res.json();
            setPreview(Array.isArray(data) ? data : []);
            setShowPreview(true);
          } catch {
            setPreview([]);
          } finally {
            setLoading(false);
          }
        }, 300)
      : (setPreview([]), setShowPreview(false), undefined);
    return () => t && clearTimeout(t);
  }, [q]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    if (searchRef.current && !searchRef.current.contains(target)) {
      setSearchOpen(false);
      setShowPreview(false);
    }
    if (moreRef.current && !moreRef.current.contains(target)) {
      setMoreOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);


  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) {
      setSearchOpen(false);
      setShowPreview(false);
      router.push(`/busca?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <>
      <header className="bg-[#000000] relative">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Esquerda: Menu dropdown (hover) + Lupa */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-1.5 py-2 pr-2 pl-2 text-white/80 hover:text-white transition-colors"
                  aria-label="Menu"
                  aria-expanded="false"
                  aria-haspopup="true"
                >
                  <Menu className="w-5 h-5" />
                  <span className="hidden sm:inline text-sm font-medium">Menu</span>
                  <ChevronDown className="w-4 h-4 hidden sm:block opacity-70" />
                </button>
                <div className="absolute top-full left-0 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                  <nav className="min-w-[220px] bg-white rounded-lg shadow-lg border border-[#e8ebed] py-2">
                    <ul>
                      {MAIN_NAV_ITEMS.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-2.5 text-[#4e5b60] hover:text-[#ff751f] hover:bg-[#f8f9fa] transition-colors"
                          >
                            <item.icon className="w-4 h-4 shrink-0 opacity-70" strokeWidth={2} />
                            <span className="text-sm">{item.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </div>
              <div className="relative" ref={searchRef}>
                {searchOpen ? (
                  <form
                    onSubmit={handleSearch}
                    className="flex items-center gap-1"
                  >
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="search"
                        placeholder="Buscar..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onBlur={() => { /* keep open on blur for preview */ }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setSearchOpen(false);
                            setShowPreview(false);
                          }
                        }}
                        autoFocus
                        className="w-40 sm:w-48 pl-8 pr-3 py-1.5 bg-white/5 border border-white/20 rounded text-white placeholder:text-slate-500 focus:outline-none focus:border-white/40 text-sm"
                      />
                      {showPreview && q.trim().length >= 2 && (
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-[#e8ebed] overflow-hidden z-50 w-72 max-h-80 overflow-y-auto">
                          {loading ? (
                            <div className="px-4 py-6 text-center text-[#859eac] text-sm">Buscando...</div>
                          ) : preview.length > 0 ? (
                            <>
                              {preview.map((post) => (
                                <Link
                                  key={post.id}
                                  href={`/post/${post.slug}`}
                                  className="flex gap-3 px-4 py-3 hover:bg-[#f5f6f7] border-b border-[#e8ebed]"
                                  onClick={() => setSearchOpen(false)}
                                >
                                  <div className="w-12 h-12 shrink-0 rounded overflow-hidden bg-[#e8ebed]">
                                    {post.featuredImage ? (
                                      /* eslint-disable-next-line @next/next/no-img-element */
                                      <img src={post.featuredImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[#859eac] text-xs">Foz</div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-headline font-bold text-[#4e5b60] line-clamp-1 text-sm">{post.title}</p>
                                  </div>
                                </Link>
                              ))}
                              <Link
                                href={`/busca?q=${encodeURIComponent(q.trim())}`}
                                className="block px-4 py-3 bg-[#f5f6f7] text-[#ff751f] font-medium text-sm text-center"
                                onClick={() => setSearchOpen(false)}
                              >
                                Ver todos →
                              </Link>
                            </>
                          ) : (
                            <div className="px-4 py-6 text-center text-[#859eac] text-sm">Nenhum resultado</div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSearchOpen(false); setShowPreview(false); }}
                      className="p-1.5 text-white/60 hover:text-white"
                      aria-label="Fechar busca"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="p-2 text-white/80 hover:text-white transition-colors"
                    aria-label="Buscar"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Centro: Logo */}
            <Link
              href="/"
              className="absolute left-1/2 -translate-x-1/2 flex items-center hover:opacity-90 transition-opacity"
              aria-label="Foz em Destaque - Página inicial"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-foz-em-destaque.png"
                alt="Foz em Destaque"
                className="h-10 w-auto"
              />
            </Link>

            {/* Direita: Visitas + Idioma */}
            <div className="flex items-center gap-4 sm:gap-6 shrink-0">
              <VisitCounter />
              <div className="hidden sm:block h-4 w-px bg-[#4e5b60]" />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
        <div className="h-px bg-[#ff751f]/50" />
      </header>
      <nav className="bg-white border-b border-[#e8ebed]">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-x-6 text-sm w-full">
          <div className="flex items-center gap-x-6 flex-1 min-w-0 overflow-x-auto overflow-y-visible">
            {MENU_ITEMS.slice(0, 11).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[#4e5b60] hover:text-[#ff751f] transition-colors whitespace-nowrap shrink-0"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="relative shrink-0" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              className="flex items-center gap-1 text-[#4e5b60] hover:text-[#ff751f] transition-colors"
              aria-label="Ver mais categorias"
              aria-expanded={moreOpen}
            >
              <MoreHorizontal className="w-4 h-4" />
              <span>Ver mais</span>
            </button>
            {moreOpen && (
              <div className="absolute top-full right-0 mt-1 py-2 bg-white rounded-lg shadow-lg border border-[#e8ebed] z-[100] min-w-[180px]">
                {MENU_ITEMS.slice(11).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-2 text-sm text-[#4e5b60] hover:text-[#ff751f] hover:bg-[#f8f9fa] transition-colors"
                    onClick={() => setMoreOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
