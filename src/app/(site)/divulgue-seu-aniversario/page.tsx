import Link from "next/link";
import { HighSocietyClubCard } from "@/components/site/HighSocietyClubCard";
import { TaxaAdesaoSection } from "@/components/site/TaxaAdesaoSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Divulgue seu Aniversário",
  description:
    "HighSocietyClub Foz em Destaque - Divulgue seu aniversário e faça parte do clube de vantagens.",
};

export default function DivulgueSeuAniversarioPage() {
  return (
    <article className="max-w-3xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#ff751f] transition-colors mb-12"
      >
        ← Voltar ao início
      </Link>

      <header className="mb-12 text-center">
        <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
          Divulgue seu Aniversário
        </h1>
        <p className="mt-4 text-slate-600 max-w-xl mx-auto">
          Faça parte do HighSocietyClub e aproveite descontos, sorteios e vantagens exclusivas.
        </p>
      </header>

      {/* Product card - HighSocietyClub */}
      <section className="mb-20">
        <HighSocietyClubCard />
      </section>

      {/* Taxa de Adesão - Pagamento */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Taxa de Adesão — R$ 28/ano
        </h2>
        <p className="text-slate-600 mb-6">
          Apoie nosso trabalho fazendo parte do HighSocietyClub Foz em Destaque. Escolha a forma de pagamento abaixo:
        </p>
        <TaxaAdesaoSection />
        <p className="text-slate-500 text-sm mt-6 text-center">
          Muito obrigado por participar!
        </p>
      </section>
    </article>
  );
}
