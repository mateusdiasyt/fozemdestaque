import Link from "next/link";
import { ClockAndWeather } from "@/components/site/ClockAndWeather";
import { BlockThumbnails } from "@/components/site/BlockThumbnails";

export function SiteHeader() {
  return (
    <header className="bg-slate-900 text-white border-b-4 border-red-600">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <Link href="/" className="flex items-center">
            <span className="font-headline text-3xl font-bold tracking-tight">
              Foz em Destaque
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-6 lg:gap-8">
            <BlockThumbnails type="aniversario" limit={1} />
            <BlockThumbnails type="data" limit={1} />
            <BlockThumbnails type="reflexao" limit={1} />
            <ClockAndWeather />
          </div>
        </div>
      </div>
    </header>
  );
}
