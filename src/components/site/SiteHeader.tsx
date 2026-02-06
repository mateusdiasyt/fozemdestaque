import Link from "next/link";
import { ClockAndWeather } from "@/components/site/ClockAndWeather";
import { BlockThumbnails } from "@/components/site/BlockThumbnails";
import { VisitCounter } from "@/components/site/VisitCounter";

export function SiteHeader() {
  return (
    <header className="bg-[#000000] text-white border-b-4 border-[#ff751f]">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <Link href="/" className="flex items-center">
              <span className="font-headline text-3xl font-bold tracking-tight">
                Foz em <span className="text-[#ff751f]">Destaque</span>
              </span>
            </Link>
            <VisitCounter />
          </div>
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
