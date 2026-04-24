"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { VisitCounter } from "@/components/site/VisitCounter";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { HEADER_PRIMARY_CATEGORIES } from "@/lib/menu-items";
import { SiteImage } from "@/components/site/SiteImage";

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
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<PreviewPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname === "/busca") setQ(searchParams?.get("q") ?? "");
  }, [pathname, searchParams]);

  useEffect(() => {
    const t =
      q.trim().length >= 2
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
      <header className="relative bg-[#000000]">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative" ref={searchRef}>
                {searchOpen ? (
                  <form onSubmit={handleSearch} className="flex items-center gap-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                      <input
                        type="search"
                        placeholder="Buscar..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onBlur={() => {
                          // keep open on blur for preview
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setSearchOpen(false);
                            setShowPreview(false);
                          }
                        }}
                        autoFocus
                        className="w-40 rounded border border-white/20 bg-white/5 py-1.5 pl-8 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none sm:w-48"
                      />
                      {showPreview && q.trim().length >= 2 && (
                        <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-72 overflow-hidden overflow-y-auto rounded-lg border border-[#e8ebed] bg-white shadow-lg">
                          {loading ? (
                            <div className="px-4 py-6 text-center text-sm text-[#859eac]">Buscando...</div>
                          ) : preview.length > 0 ? (
                            <>
                              {preview.map((post) => (
                                <Link
                                  key={post.id}
                                  href={`/post/${post.slug}`}
                                  className="flex gap-3 border-b border-[#e8ebed] px-4 py-3 hover:bg-[#f5f6f7]"
                                  onClick={() => setSearchOpen(false)}
                                >
                                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-[#e8ebed]">
                                    {post.featuredImage ? (
                                      <SiteImage src={post.featuredImage} alt="" className="h-full w-full object-cover" fallback={<div className="flex h-full w-full items-center justify-center text-xs text-[#859eac]">Foz</div>} />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-xs text-[#859eac]">Foz</div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="line-clamp-1 font-headline text-sm font-bold text-[#4e5b60]">{post.title}</p>
                                  </div>
                                </Link>
                              ))}
                              <Link
                                href={`/busca?q=${encodeURIComponent(q.trim())}`}
                                className="block bg-[#f5f6f7] px-4 py-3 text-center text-sm font-medium text-[#ff751f]"
                                onClick={() => setSearchOpen(false)}
                              >
                                Ver todos →
                              </Link>
                            </>
                          ) : (
                            <div className="px-4 py-6 text-center text-sm text-[#859eac]">Nenhum resultado</div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        setShowPreview(false);
                      }}
                      className="p-1.5 text-white/60 hover:text-white"
                      aria-label="Fechar busca"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="p-2 text-white/80 transition-colors hover:text-white"
                    aria-label="Buscar"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <Link
              href="/"
              className="absolute left-1/2 flex -translate-x-1/2 items-center transition-opacity hover:opacity-90"
              aria-label="Foz em Destaque - Pagina inicial"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-foz-em-destaque.png" alt="Foz em Destaque" className="h-10 w-auto" />
            </Link>

            <div className="flex shrink-0 items-center gap-4 sm:gap-6">
              <VisitCounter />
              <div className="hidden h-4 w-px bg-[#4e5b60] sm:block" />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
        <div className="h-px bg-[#ff751f]/50" />
      </header>

      <nav className="border-b border-[#e8ebed] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-2.5 text-sm">
          <div className="flex items-center justify-center gap-x-6 overflow-x-auto overflow-y-visible">
            {HEADER_PRIMARY_CATEGORIES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 whitespace-nowrap text-[#4e5b60] transition-colors hover:text-[#ff751f]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
