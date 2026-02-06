import Link from "next/link";
import { AniversarioForm } from "@/components/site/AniversarioForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Divulgue seu Aniversário",
  description:
    "HighSocietyClub Foz em Destaque - Divulgue seu aniversário e faça parte do clube de vantagens.",
};

const beneficios = [
  "Ter seu aniversário divulgado em nossas redes (Portal Foz em Destaque, Instagram, Fanpage, Grupos WhatsApp e Grupos Facebook)",
  "Conteúdo exclusivo",
  "Divulgação de outro aniversário mais todas as vantagens para um dependente",
  "Ter acesso a todas as promoções com as empresas cadastradas",
  "Participar de sorteios periódicos",
  "Receber informações sobre promoções e oportunidades pelas redes sociais ou contatos cadastrados",
  "Ter descontos e vantagens nos produtos e serviços de divulgação e marketing da Foz em Destaque",
  "Acesso com descontos promocionais aos eventos da Foz em Destaque e/ou Certames de Beleza",
  "Acesso ao guia de compras e serviços exclusivo dos assinantes HighSocietyClub",
  "Outras promoções criadas e pensadas para você",
];

export default function DivulgueSeuAniversarioPage() {
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
          Divulgue seu Aniversário
        </h1>
      </header>

      <section className="rounded-2xl bg-slate-50 border border-slate-100 p-8 mb-20">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          HighSocietyClub Foz em Destaque
        </h2>
        <p className="text-slate-600 mb-6 leading-relaxed">
          O que antes era uma listagem de aniversariantes VIPs de nossa sociedade, agora vem se
          transformando em clube de vantagens e oportunidades: descontos, compras premiadas,
          sorteios, promoções, eventos. Bem-vindo(a) a este clube feito especialmente para você!
        </p>
        <p className="text-slate-900 font-medium mb-4">Esta inscrição dá direito a:</p>
        <ul className="space-y-4">
          {beneficios.map((b, i) => (
            <li key={i} className="text-slate-600 text-sm leading-relaxed flex gap-3">
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
              {b}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-20">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Formulário de Inscrição</h2>
        <AniversarioForm />
      </section>

      <section className="rounded-2xl bg-slate-50 border border-slate-100 p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Taxa de Adesão — R$ 28/ano
        </h2>
        <p className="text-slate-600 mb-6">
          Apoie nosso trabalho fazendo parte do HighSocietyClub Foz em Destaque.
        </p>
        <div className="space-y-6 text-slate-600 text-sm">
          <div>
            <p className="font-medium text-slate-900 mb-1">1. PIX (Chave CNPJ)</p>
            <p>04.276.794/0001-71</p>
          </div>
          <div>
            <p className="font-medium text-slate-900 mb-2">2. Transferência Bancária</p>
            <ul className="space-y-2">
              <li>Banco: SICOOB Cooperativa de Crédito Três Fronteiras (756)</li>
              <li>Correntista: Marco Antonio Freire ME</li>
              <li>CNPJ: 04.276.794/0001-71</li>
              <li>Conta Corrente: 5.015-6</li>
              <li>Agência: 4343-5 (Foz do Iguaçu - PR)</li>
            </ul>
          </div>
        </div>
        <p className="text-slate-500 text-sm mt-6">Muito obrigado por participar!</p>
      </section>
    </article>
  );
}
