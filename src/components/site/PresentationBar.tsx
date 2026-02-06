"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function PresentationBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (pathname === "/busca") {
      setQ(searchParams.get("q") ?? "");
    }
  }, [pathname, searchParams]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) {
      router.push(`/busca?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div className="bg-white border-b border-[#e8ebed]">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="font-headline text-xl md:text-2xl font-bold text-[#000000] uppercase tracking-wide">
            Notícias e Destaque em Foz do Iguaçu
          </h2>
          <form onSubmit={handleSearch} className="flex w-full sm:w-auto sm:min-w-[280px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#859eac]" aria-hidden />
              <input
                type="search"
                placeholder="Procurar conteúdo..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#e8ebed] rounded-l-lg focus:outline-none focus:ring-2 focus:ring-[#ff751f]/50 focus:border-[#ff751f] text-[#4e5b60] placeholder:text-[#859eac]"
                aria-label="Procurar conteúdo"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#ff751f] text-white font-medium rounded-r-lg hover:bg-[#e56a1a] transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
