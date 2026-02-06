"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp, User } from "lucide-react";
const ESTADO_CIVIL: Record<string, string> = {
  casado: "Casado(a)",
  solteiro: "Solteiro(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
};

interface Submission {
  id: string;
  nomeCompleto: string;
  cpfRucCuit: string;
  documentoIdentidade: string | null;
  dataNascimento: Date;
  cidadeNascimento: string | null;
  cidadeReside: string;
  nomeSocial: string;
  foneContato: string | null;
  email: string;
  profissao: string;
  empresaAtual: string;
  cargo: string | null;
  instagram: string;
  facebook: string;
  instagramProfissional: string | null;
  estadoCivil: string;
  nomeConjuge: string | null;
  dataCasamento: Date | null;
  outrasInformacoes: string | null;
  autorizaPublicacao: boolean;
  createdAt: Date;
}

export function AniversariosManager({ submissions }: { submissions: Submission[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
        Nenhuma inscrição ainda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((s) => {
        const isExpanded = expanded === s.id;
        return (
          <div
            key={s.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            <button
              onClick={() => setExpanded(isExpanded ? null : s.id)}
              className="w-full flex items-center justify-between gap-4 p-4 hover:bg-slate-50 text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-[#ff751f]/10 text-[#ff751f]">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{s.nomeSocial}</p>
                  <p className="text-sm text-slate-500 truncate">{s.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-sm text-slate-500">
                  {format(new Date(s.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-slate-200 p-4 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><strong>Nome completo:</strong> {s.nomeCompleto}</div>
                  <div><strong>CPF/RUC/CUIT:</strong> {s.cpfRucCuit}</div>
                  {s.documentoIdentidade && (
                    <div><strong>Doc. identidade:</strong> {s.documentoIdentidade}</div>
                  )}
                  <div>
                    <strong>Nascimento:</strong>{" "}
                    {format(new Date(s.dataNascimento), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                  {s.cidadeNascimento && (
                    <div><strong>Cidade nascimento:</strong> {s.cidadeNascimento}</div>
                  )}
                  <div><strong>Cidade reside:</strong> {s.cidadeReside}</div>
                  <div><strong>Fone:</strong> {s.foneContato || "—"}</div>
                  <div><strong>Profissão:</strong> {s.profissao}</div>
                  <div><strong>Empresa:</strong> {s.empresaAtual}</div>
                  {s.cargo && (
                    <div><strong>Cargo:</strong> {s.cargo}</div>
                  )}
                  <div><strong>Instagram:</strong> {s.instagram}</div>
                  <div><strong>Facebook:</strong> {s.facebook}</div>
                  {s.instagramProfissional && (
                    <div><strong>Instagram profissional:</strong> {s.instagramProfissional}</div>
                  )}
                  <div><strong>Estado civil:</strong> {ESTADO_CIVIL[s.estadoCivil] ?? s.estadoCivil}</div>
                  {s.nomeConjuge && (
                    <div><strong>Nome cônjuge:</strong> {s.nomeConjuge}</div>
                  )}
                  {s.dataCasamento && (
                    <div>
                      <strong>Data casamento:</strong>{" "}
                      {format(new Date(s.dataCasamento), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  )}
                  <div>
                    <strong>Autoriza publicação:</strong>{" "}
                    {s.autorizaPublicacao ? "Sim" : "Não"}
                  </div>
                  {s.outrasInformacoes && (
                    <div className="md:col-span-2">
                      <strong>Outras informações:</strong>
                      <p className="mt-1 text-slate-600">{s.outrasInformacoes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
