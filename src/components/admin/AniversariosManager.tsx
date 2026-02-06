"use client";

import { useState } from "react";
import { format, addYears, setYear, isBefore, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp, User, Cake, CheckCircle, XCircle, Loader2 } from "lucide-react";

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
  dataNascimento: Date | string;
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
  dataCasamento: Date | string | null;
  outrasInformacoes: string | null;
  autorizaPublicacao: boolean;
  ativo?: boolean;
  createdAt: Date | string;
}

function getNextBirthday(birthDate: Date): Date {
  const today = new Date();
  const bd = new Date(birthDate);
  let next = setYear(bd, today.getFullYear());
  if (isBefore(next, today) || isToday(next)) {
    next = addYears(next, 1);
  }
  return next;
}

export function AniversariosManager({ submissions }: { submissions: Submission[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [localSubs, setLocalSubs] = useState(submissions);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const today = new Date();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const aniversariantesDoDia = localSubs.filter((s) => {
    if (!s.ativo) return false;
    const d = new Date(s.dataNascimento);
    return d.getMonth() === todayM && d.getDate() === todayD;
  });

  const proximosAniversarios = localSubs
    .filter((s) => s.ativo)
    .map((s) => ({
      ...s,
      nextBday: getNextBirthday(new Date(s.dataNascimento)),
    }))
    .sort((a, b) => a.nextBday.getTime() - b.nextBday.getTime())
    .slice(0, 10);

  async function toggleAtivo(s: Submission) {
    setTogglingId(s.id);
    try {
      const res = await fetch(`/api/admin/aniversarios/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !s.ativo }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      setLocalSubs((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, ativo: !x.ativo } : x))
      );
    } catch {
      alert("Erro ao atualizar status.");
    } finally {
      setTogglingId(null);
    }
  }

  if (localSubs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
        Nenhuma inscrição ainda.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Cake className="w-4 h-4 text-[#ff751f]" />
            Aniversariantes do dia
          </h3>
          {aniversariantesDoDia.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum aniversariante hoje.</p>
          ) : (
            <ul className="space-y-2">
              {aniversariantesDoDia.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff751f]" />
                  <span className="font-medium text-slate-800">{s.nomeSocial}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Cake className="w-4 h-4 text-[#ff751f]" />
            Próximos aniversários
          </h3>
          {proximosAniversarios.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum cliente ativo. Marque inscrições como &quot;Taxa paga&quot; para exibir.
            </p>
          ) : (
            <ul className="space-y-2">
              {proximosAniversarios.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-800 truncate">{s.nomeSocial}</span>
                  <span className="text-slate-500 shrink-0">
                    {format(s.nextBday, "dd/MM", { locale: ptBR })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Lista de inscrições */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Todas as inscrições</h3>
        <div className="space-y-3">
          {localSubs.map((s) => {
            const isExpanded = expanded === s.id;
            const dataBday = new Date(s.dataNascimento);
            const bdayStr = format(dataBday, "dd/MM", { locale: ptBR });
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
                    <div
                      className={`p-2 rounded-lg ${s.ativo ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"}`}
                    >
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{s.nomeSocial}</p>
                      <p className="text-sm text-slate-500 truncate">{s.email}</p>
                      {s.ativo && (
                        <p className="text-xs text-green-600 mt-0.5">
                          Aniversário: {bdayStr}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${s.ativo ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {s.ativo ? "Cliente ativo" : "Pendente"}
                    </span>
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
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAtivo(s);
                        }}
                        disabled={togglingId === s.id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${s.ativo ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                      >
                        {togglingId === s.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : s.ativo ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Taxa paga (cliente ativo)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            Marcar taxa paga
                          </>
                        )}
                      </button>
                    </div>
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
                      {s.cargo && <div><strong>Cargo:</strong> {s.cargo}</div>}
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
      </div>
    </div>
  );
}
