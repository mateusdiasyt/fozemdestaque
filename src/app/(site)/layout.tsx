import Link from "next/link";
import { HeaderBanner } from "@/components/site/HeaderBanner";
import { PresentationBar } from "@/components/site/PresentationBar";

export const dynamic = "force-dynamic";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Sidebar } from "@/components/site/Sidebar";
import { FooterBanner } from "@/components/site/FooterBanner";
import { LateralBanners } from "@/components/site/LateralBanners";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f6f7]">
      <SiteHeader />
      <HeaderBanner />
      <PresentationBar />
      <div className="flex-1 flex gap-6 max-w-7xl mx-auto w-full px-4 py-8">
        <aside className="hidden lg:block w-60 shrink-0">
          <Sidebar />
        </aside>
        <main className="flex-1 min-w-0 max-w-4xl">{children}</main>
        <aside className="hidden xl:block w-52 shrink-0">
          <LateralBanners />
        </aside>
      </div>
      <FooterBanner />
      <footer className="bg-black text-slate-400">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 pb-8 border-b border-white/10">
            <Link href="/nossa-historia" className="text-sm hover:text-white transition-colors">
              Nossa História
            </Link>
            <Link href="/produtos-servicos" className="text-sm hover:text-white transition-colors">
              Produtos e Serviços
            </Link>
            <Link href="/divulgue-seu-aniversario" className="text-sm hover:text-white transition-colors">
              Divulgue seu Aniversário
            </Link>
            <Link href="/contatos" className="text-sm hover:text-white transition-colors">
              Contatos
            </Link>
          </nav>
          <p className="text-center text-sm text-slate-500 pt-8">
            O site foi feito por Mateus Mendoza{" "}
            <a
              href="https://www.instagram.com/devmateusmendoza"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff751f] hover:text-[#ff751f]/90 transition-colors"
            >
              @devmanteusmendoza
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
