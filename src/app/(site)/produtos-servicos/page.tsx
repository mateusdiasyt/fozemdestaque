import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Produtos e Serviços",
  description:
    "Marketing, filmagem de eventos, cobertura fotográfica e eventos de beleza. Seja destaque na coluna social.",
};

const FILMAGEM_ITENS = [
  "Câmera Man profissional",
  "Repórter",
  "Equipamentos profissionais",
  "Edição do vídeo",
  "Divulgação na Foz TV",
  "Divulgação em nossas mídias: Portal, fanpage e Instagram @fozemdestaque",
];

const COBERTURA_ITENS = [
  "Fotógrafo profissional",
  "Equipamentos profissionais",
  "Fotos com tratamento digital",
  "Divulgação em nossas mídias: Portal, fanpage e Instagram @fozemdestaque",
];

export default function ProdutosServicosPage() {
  return (
    <article className="max-w-3xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#ff751f] transition-colors mb-12"
      >
        ← Voltar ao início
      </Link>

      <header className="mb-16">
        <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
          Produtos e Serviços
        </h1>
        <p className="mt-6 text-slate-600 text-lg leading-relaxed">
          Seja destaque em nossa coluna social e ganhe relevância no Google. Participe e apareça em
          nossos eventos.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-[#ff751f] uppercase tracking-wider mb-4">
            Filmagem de eventos
          </h3>
          <p className="text-slate-600 text-sm mb-4">Inclui:</p>
          <ul className="space-y-3">
            {FILMAGEM_ITENS.map((item, i) => (
              <li key={i} className="text-slate-600 text-sm leading-relaxed flex gap-3">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex justify-center mb-4">
            <div className="relative h-20 w-40">
              <Image
                src="/images/produtos-servicos/certames-de-beleza.png"
                alt="Certames de Beleza"
                fill
                className="object-contain"
                sizes="160px"
              />
            </div>
          </div>
          <h3 className="text-sm font-semibold text-[#ff751f] uppercase tracking-wider mb-4">
            Eventos de beleza
          </h3>
          <p className="text-slate-600 text-sm mb-4">
            Patrocine e participe de nossos eventos de beleza:
          </p>
          <ul className="space-y-3 mb-6">
            {["MISS FOZ DO IGUAÇU", "RAINHA DO TURISMO", "MISS PARANÁ GLOBO"].map((item, i) => (
              <li key={i} className="text-slate-600 text-sm font-medium flex gap-3">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
          <a
            href="https://www.certamesdebeleza.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[#ff751f] hover:text-[#e56a1a] transition-colors"
          >
            Saiba mais em certamesdebeleza.com
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-[#ff751f] uppercase tracking-wider mb-4">
            Cobertura fotográfica
          </h3>
          <p className="text-slate-600 text-sm mb-4">Inclui:</p>
          <ul className="space-y-3">
            {COBERTURA_ITENS.map((item, i) => (
              <li key={i} className="text-slate-600 text-sm leading-relaxed flex gap-3">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}
