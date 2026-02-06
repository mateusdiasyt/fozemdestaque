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
    <div className="space-y-10">
      <header>
        <Link
          href="/"
          className="text-sm text-[#ff751f] hover:text-[#e56a1a] font-medium mb-2 inline-block"
        >
          ← Voltar ao início
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <span className="h-1 w-12 bg-[#ff751f] rounded" />
          <h1 className="font-headline text-2xl md:text-4xl font-bold text-[#000000]">
            Divulgue seu Aniversário
          </h1>
        </div>
      </header>

      <section className="bg-[#f5f6f7] rounded-xl p-6 border border-[#e8ebed]">
        <h2 className="font-headline text-lg font-bold text-[#000000] mb-3">
          HighSocietyClub Foz em Destaque
        </h2>
        <p className="text-[#4e5b60] mb-4">
          O que antes era uma listagem de aniversariantes VIPs de nossa sociedade, agora vem se
          transformando em clube de vantagens e oportunidades: descontos, compras premiadas,
          sorteios, promoções, eventos. Bem-vindo(a) a este clube feito especialmente para você!
        </p>
        <p className="text-[#4e5b60] font-medium mb-2">Esta inscrição dá direito a:</p>
        <ul className="space-y-1 text-[#4e5b60] text-sm list-disc list-inside">
          {beneficios.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-headline text-xl font-bold text-[#000000] mb-6 flex items-center gap-2">
          <span className="h-1 w-8 bg-[#ff751f] rounded" />
          Formulário de Inscrição
        </h2>
        <AniversarioForm />
      </section>

      <section className="bg-[#f5f6f7] rounded-xl p-6 border border-[#e8ebed]">
        <h2 className="font-headline text-lg font-bold text-[#000000] mb-4">
          Taxa de Adesão — R$ 28/ano
        </h2>
        <p className="text-[#4e5b60] mb-4">
          Apoie nosso trabalho fazendo parte do HighSocietyClub Foz em Destaque.
        </p>
        <div className="space-y-4 text-[#4e5b60] text-sm">
          <div>
            <strong>1. PIX (Chave CNPJ):</strong> 04.276.794/0001-71
          </div>
          <div>
            <strong>2. Transferência Bancária</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>Banco: SICOOB Cooperativa de Crédito Três Fronteiras (756)</li>
              <li>Correntista: Marco Antonio Freire ME</li>
              <li>CNPJ: 04.276.794/0001-71</li>
              <li>Conta Corrente: 5.015-6</li>
              <li>Agência: 4343-5 (Foz do Iguaçu - PR)</li>
            </ul>
          </div>
        </div>
        <p className="text-[#859eac] text-sm mt-4">Muito obrigado por participar!</p>
      </section>
    </div>
  );
}
