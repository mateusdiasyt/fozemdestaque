import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Instagram, Facebook, Youtube, Globe, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Nossa História",
  description:
    "Conheça a história da Foz em Destaque, fundada em 1982 por Das Graças e Ary de Campos.",
};

const PUBLICATIONS = [
  { year: "1982", name: "HOJE REGIONAL – CASCAVEL" },
  { year: "1987", name: "PRIMEIRA HORA – FOZ DO IGUAÇU" },
  { year: "1990", name: "VOZ DA FRONTEIRA" },
  { year: "1991", name: "A GAZETA DO IGUAÇU" },
  { year: "1994", name: "GAZETA DO PARANÁ" },
  { year: "1998", name: "PRIMEIRA LINHA" },
  { year: "2005", name: "JORNAL DO IGUAÇU" },
  { name: "Revista TOUR IN FOZ, subsidiária da TOUR IN RIO" },
  { name: "Revista CHARME" },
  { name: "Revista Cidade de São Paulo" },
];

const DAS_GRACAS = [
  "Troféu Bola de Ouro (1990)",
  "Medalha e diploma de Amiga da Marinha (1992)",
  "Moção de Aplauso – Câmara Municipal de Foz do Iguaçu (1992)",
  'Prêmio Distinção Brasil "Gente do Ano" – Centro Cultural de Pesquisas e Estudos Sociais (1995)',
  '"Colunista Social do Ano" – Empresa Podium, Cascavel/PR (1996)',
  'Diploma "Amigo do Clube" – Foz do Iguaçu Country Clube (1997)',
  'Troféu "The Best" – Colunista do Ano (1998)',
  'Diploma "Grande Amigo da APACOS" – Associação Paulista de Colunistas Sociais (1999)',
  'Diploma "Honra ao Mérito" – 12.º Congresso Brasileiro de Colunistas Sociais – FEBRACOS (2002)',
  'Troféu "Mulher Destaque" – BPW – Associação Mulheres de Negócio de Foz (2006)',
  'Troféu "Top de Jornalismo Social" – Confraria de Eventos Elaine Caús (2008)',
];

const ARY_CAMPOS = [
  "Cumprimentos pela Chefia da Arrecadação – Receita Federal de Angra dos Reis/RJ (1976)",
  "Elogio a excelente performance e colaboração – Joseph Affonso Monteiro de Barros Menusier (1982)",
  "Eleito membro da ADESG – Associação dos Diplomados da Escola Superior de Guerra (1988)",
  "Ofício cumprimentando pela colaboração nas eleições – Dr. Luiz Sérgio Neiva (1992)",
  "Medalha de Ouro, Diploma de Honra ao Mérito – 56 Anos de Trabalhos no Serviço Público (1998)",
  'Inauguração Espaço Cultural "Ary de Campos" – Faculdade UDC (2004)',
];

export default function NossaHistoriaPage() {
  return (
    <article className="max-w-3xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#ff751f] transition-colors mb-12"
      >
        ← Voltar ao início
      </Link>

      {/* Hero */}
      <header className="mb-16">
        <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
          Nossa História
        </h1>
        <p className="mt-6 text-slate-600 text-lg leading-relaxed max-w-2xl">
          A Foz em Destaque foi fundada em 1982 pela fotógrafa Das Graças e seu marido Ary de
          Campos, redator de sua coluna social que mais tarde veio a ostentar este nome.
        </p>
      </header>

      {/* Fundadores */}
      <section className="mb-20">
        <div className="relative w-full aspect-[4/3] max-w-xl mx-auto rounded-2xl overflow-hidden bg-slate-100">
          <Image
            src="/images/nossa-historia/fundadores-das-gracas-ary.png"
            alt="Das Graças e Ary de Campos, fundadores da Foz em Destaque"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 512px"
            priority
          />
        </div>
        <p className="text-center text-slate-500 text-sm mt-4">
          Das Graças e Ary de Campos — Fundadores
        </p>
      </section>

      {/* Colunas Sociais */}
      <section className="mb-20">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Colunas Sociais</h2>
        <p className="text-slate-600 mb-8">
          Ao longo de seus trabalhos, Das Graças e Ary escreveram para os seguintes veículos — cerca
          de 3.500 edições:
        </p>
        <div className="space-y-3">
          {PUBLICATIONS.map((item, i) => (
            <div
              key={i}
              className="flex items-baseline gap-4 py-2 border-b border-slate-100 last:border-0"
            >
              {item.year && (
                <span className="text-xs font-medium text-[#ff751f] w-12 shrink-0">{item.year}</span>
              )}
              {!item.year && <span className="w-12 shrink-0" />}
              <span className="text-slate-600">{item.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Prêmios - dois cards */}
      <section className="mb-20 grid md:grid-cols-2 gap-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-[#ff751f] uppercase tracking-wider mb-6">
            Das Graças
          </h3>
          <ul className="space-y-4">
            {DAS_GRACAS.map((item, i) => (
              <li key={i} className="text-slate-600 text-sm leading-relaxed flex gap-3">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-[#ff751f] uppercase tracking-wider mb-6">
            Ary de Campos
          </h3>
          <ul className="space-y-4">
            {ARY_CAMPOS.map((item, i) => (
              <li key={i} className="text-slate-600 text-sm leading-relaxed flex gap-3">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Hoje */}
      <section className="mb-20">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Hoje</h2>
        <p className="text-slate-600 mb-8">
          A empresa é tocada por uma equipe focada em dar continuidade ao trabalho iniciado pelos
          fundadores, liderados pelo filho do casal Marco Antonio Freire e pela sobrinha Ana Tereza
          Carvalho.
        </p>
        <div className="relative w-full aspect-[4/3] max-w-xl mx-auto rounded-2xl overflow-hidden bg-slate-100">
          <Image
            src="/images/nossa-historia/marco-ana.png"
            alt="Marco Antonio Freire e Ana Tereza Carvalho"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 512px"
          />
        </div>
        <p className="text-center text-slate-500 text-sm mt-4">
          Marco Antonio Freire e Ana Tereza Carvalho
        </p>
      </section>

      {/* Canais */}
      <section className="mb-20">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Canais de Comunicação</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://www.fozemdestaque.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 hover:border-[#ff751f] hover:text-[#ff751f] transition-colors text-sm"
          >
            <Globe className="w-4 h-4" />
            Portal
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <a
            href="https://www.instagram.com/fozemdestaque/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 hover:border-[#ff751f] hover:text-[#ff751f] transition-colors text-sm"
          >
            <Instagram className="w-4 h-4" />
            Instagram
          </a>
          <a
            href="https://www.facebook.com/FozEmDestaque/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 hover:border-[#ff751f] hover:text-[#ff751f] transition-colors text-sm"
          >
            <Facebook className="w-4 h-4" />
            Facebook
          </a>
          <a
            href="https://www.youtube.com/c/FozemDestaque"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 hover:border-[#ff751f] hover:text-[#ff751f] transition-colors text-sm"
          >
            <Youtube className="w-4 h-4" />
            YouTube
          </a>
          <a
            href="https://x.com/fozemdestaque"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 hover:border-[#ff751f] hover:text-[#ff751f] transition-colors text-sm"
          >
            X
          </a>
          <a
            href="https://www.facebook.com/groups/fozemdestaque/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 hover:border-[#ff751f] hover:text-[#ff751f] transition-colors text-sm"
          >
            Grupo Facebook
          </a>
          <a
            href="https://www.certamesdebeleza.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 hover:border-[#ff751f] hover:text-[#ff751f] transition-colors text-sm"
          >
            Certames de Beleza
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </section>

      {/* Atividades */}
      <section className="rounded-2xl bg-slate-50 border border-slate-100 p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Atividades</h2>
        <p className="text-slate-600 leading-relaxed">
          Além do colunismo social e marketing, realizamos eventos de beleza através da subsidiária
          Certames de Beleza. Também damos continuidade ao trabalho de fotografia e filmagem de
          eventos, garantindo farto conteúdo para nosso trabalho de Colunismo Social.
        </p>
      </section>
    </article>
  );
}
