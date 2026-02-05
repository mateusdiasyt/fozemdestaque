import { HeaderBanner } from "@/components/site/HeaderBanner";

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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderBanner />
      <SiteHeader />
      <div className="flex-1 flex gap-4 max-w-7xl mx-auto w-full px-4 py-6">
        <aside className="hidden lg:block w-56 shrink-0">
          <Sidebar />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
        <aside className="hidden xl:block w-48 shrink-0">
          <LateralBanners />
        </aside>
      </div>
      <FooterBanner />
      <footer className="bg-slate-800 text-slate-300 py-6 text-center text-sm">
        © {new Date().getFullYear()} Foz em Destaque. Todos os direitos reservados.
      </footer>
    </div>
  );
}
