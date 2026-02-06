"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

interface PreviewPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
}

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<PreviewPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const wrapperRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (pathname === "/busca") {
      setQ(searchParams?.get("q") ?? "");
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setPreview([]);
      setShowPreview(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/posts?q=${encodeURIComponent(trimmed)}&limit=5`);
        const data = await res.json();
        setPreview(Array.isArray(data) ? data : []);
        setShowPreview(true);
      } catch {
        setPreview([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
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
      setShowPreview(false);
      router.push(`/busca?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form onSubmit={handleSearch} className="relative flex w-full" ref={wrapperRef}>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" aria-hidden />
        <input
          type="search"
          placeholder="Buscar..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim().length >= 2 && preview.length > 0 && setShowPreview(true)}
          onKeyDown={(e) => e.key === "Escape" && setShowPreview(false)}
          className="w-full pl-8 pr-3 py-1.5 bg-transparent border border-white/10 rounded text-white/90 placeholder:text-slate-500 focus:outline-none focus:border-white/30 text-sm"
          aria-label="Procurar conteúdo"
          aria-autocomplete="list"
          aria-expanded={showPreview && (loading || preview.length > 0)}
        />
        {showPreview && q.trim().length >= 2 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-[#e8ebed] overflow-hidden z-50 max-h-80 overflow-y-auto min-w-[320px]"
            role="listbox"
          >
            {loading ? (
              <div className="px-4 py-6 text-center text-[#859eac] text-sm">
                Buscando...
              </div>
            ) : preview.length > 0 ? (
              <>
                {preview.map((post) => (
                  <Link
                    key={post.id}
                    href={`/post/${post.slug}`}
                    role="option"
                    className="flex gap-3 px-4 py-3 hover:bg-[#f5f6f7] border-b border-[#e8ebed] last:border-b-0 transition-colors"
                    onClick={() => setShowPreview(false)}
                  >
                    <div className="w-16 h-16 shrink-0 rounded overflow-hidden bg-[#e8ebed]">
                      {post.featuredImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={post.featuredImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[#859eac] text-xs font-headline">Foz</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-headline font-bold text-[#4e5b60] line-clamp-1">{post.title}</p>
                      {post.excerpt && (
                        <p className="text-xs text-[#859eac] line-clamp-2 mt-0.5">{post.excerpt}</p>
                      )}
                    </div>
                  </Link>
                ))}
                <Link
                  href={`/busca?q=${encodeURIComponent(q.trim())}`}
                  className="block px-4 py-3 bg-[#f5f6f7] text-[#ff751f] font-medium text-sm hover:bg-[#e8ebed] text-center"
                  onClick={() => setShowPreview(false)}
                >
                  Ver todos os resultados →
                </Link>
              </>
            ) : (
              <div className="px-4 py-6 text-center text-[#859eac] text-sm">
                Nenhum resultado encontrado.
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
