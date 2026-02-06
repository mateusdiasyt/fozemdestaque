import Link from "next/link";
import { ClockAndWeather } from "@/components/site/ClockAndWeather";
import { VisitCounter } from "@/components/site/VisitCounter";
import { SearchBar } from "@/components/site/SearchBar";

export function SiteHeader() {
  return (
    <header className="bg-[#000000]">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/"
              className="text-xl font-semibold tracking-tight text-white hover:text-[#ff751f] transition-colors shrink-0"
            >
              Foz em <span className="text-[#ff751f]">Destaque</span>
            </Link>
            <div className="hidden sm:block w-48 md:w-56 lg:w-64 min-w-0">
              <SearchBar />
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <VisitCounter />
            <div className="hidden sm:block h-4 w-px bg-[#4e5b60]" />
            <ClockAndWeather />
          </div>
        </div>
      </div>
      <div className="h-px bg-[#ff751f]/50" />
    </header>
  );
}
