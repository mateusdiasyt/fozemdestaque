"use client";

import { Check } from "lucide-react";
import { AniversarioModal } from "./AniversarioModal";

const beneficios = [
  "Aniversário divulgado em nossas redes",
  "Conteúdo exclusivo",
  "Divulgação para um dependente",
  "Acesso a promoções com empresas cadastradas",
  "Participação em sorteios periódicos",
  "Informações sobre promoções pelas redes sociais",
  "Descontos em divulgação e marketing",
  "Descontos em eventos Foz em Destaque e Certames de Beleza",
  "Guia de compras exclusivo HighSocietyClub",
  "Outras promoções pensadas para você",
];

export function HighSocietyClubCard() {
  return (
    <div className="relative rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden max-w-md mx-auto">
      {/* Gradient header */}
      <div className="relative bg-gradient-to-br from-[#ff751f] via-[#e56a1a] to-[#d45f15] px-8 pt-10 pb-12">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[16px] border-t-[#d45f15]" />
        <p className="text-white/90 text-sm font-medium uppercase tracking-wider">Foz em Destaque</p>
        <h2 className="text-2xl font-bold text-white mt-1">HighSocietyClub</h2>
        <p className="text-white/80 text-sm mt-1">Clube de vantagens e oportunidades</p>
      </div>

      {/* Body */}
      <div className="p-8 -mt-2">
        <ul className="space-y-3 mb-8">
          {beneficios.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-slate-600 text-sm">
              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} />
              </span>
              {b}
            </li>
          ))}
        </ul>

        <div className="mb-6">
          <span className="text-3xl font-bold text-[#ff751f]">R$ 28</span>
          <span className="text-slate-500 text-lg font-medium">/ano</span>
        </div>

        <AniversarioModal fullWidth />
      </div>
    </div>
  );
}
