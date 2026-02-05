import Link from "next/link";
import { ClockAndWeather } from "@/components/site/ClockAndWeather";
import { BlockThumbnails } from "@/components/site/BlockThumbnails";

export function SiteHeader() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-800">Foz em Destaque</span>
          </Link>
          <div className="flex flex-wrap gap-4 md:gap-6">
            <BlockThumbnails type="aniversario" limit={1} />
            <BlockThumbnails type="data" limit={1} />
            <BlockThumbnails type="reflexao" limit={1} />
          </div>
          <ClockAndWeather />
        </div>
      </div>
    </header>
  );
}
