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
    <div className="min-h-screen flex flex-col bg-[#f5f6f7]">
      <SiteHeader />
      <HeaderBanner />
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
      <footer className="bg-[#4e5b60] text-[#859eac] py-8 text-center text-sm">
        <div className="max-w-7xl mx-auto px-4">
          © {new Date().getFullYear()} Foz em Destaque. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
