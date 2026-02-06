"use client";

import { useState, useMemo } from "react";
import { format, addYears, setYear, isBefore, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp, User, Cake, CheckCircle, XCircle, Loader2, Users, TrendingUp } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

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

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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
    .slice(0, 8);

  const chartStatus = useMemo(() => {
    const ativos = localSubs.filter((s) => s.ativo).length;
    const pendentes = localSubs.length - ativos;
    return [
      { name: "Ativos", value: ativos, color: "#22c55e" },
      { name: "Pendentes", value: pendentes, color: "#f59e0b" },
    ].filter((d) => d.value > 0);
  }, [localSubs]);

  const chartMeses = useMemo(() => {
    const porMes = MESES.map((m, i) => ({ mes: m, count: 0 }));
    localSubs.filter((s) => s.ativo).forEach((s) => {
      const m = new Date(s.dataNascimento).getMonth();
      porMes[m].count += 1;
    });
    return porMes;
  }, [localSubs]);

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
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-12 text-center text-slate-400">
        Nenhuma inscrição ainda.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats + Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Status das inscrições
          </h3>
          <div className="h-48">
            {chartStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {chartStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#f1f5f9",
                    }}
                    formatter={(value: number | undefined) => [value ?? 0, "inscrições"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 flex items-center justify-center h-full">
                Sem dados para gráfico
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Aniversários por mês
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartMeses} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="mes"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={{ stroke: "#475569" }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={{ stroke: "#475569" }}
                  tickFormatter={(v) => (v > 0 ? v : "")}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Aniversários" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                  }}
                  formatter={(value: number | undefined) => [value ?? 0, "aniversariantes"]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Cake className="w-4 h-4 text-amber-400" />
            Aniversariantes do dia
          </h3>
          {aniversariantesDoDia.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum aniversariante hoje.</p>
          ) : (
            <ul className="space-y-2">
              {aniversariantesDoDia.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="font-medium text-slate-200">{s.nomeSocial}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Cake className="w-4 h-4 text-indigo-400" />
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
                  <span className="font-medium text-slate-200 truncate">{s.nomeSocial}</span>
                  <span className="text-slate-400 shrink-0">
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
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Todas as inscrições</h3>
        <div className="space-y-3">
          {localSubs.map((s) => {
            const isExpanded = expanded === s.id;
            const dataBday = new Date(s.dataNascimento);
            const bdayStr = format(dataBday, "dd/MM", { locale: ptBR });
            return (
              <div
                key={s.id}
                className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : s.id)}
                  className="w-full flex items-center justify-between gap-4 p-4 hover:bg-slate-800/80 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${s.ativo ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-500"}`}
                    >
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-100 truncate">{s.nomeSocial}</p>
                      <p className="text-sm text-slate-500 truncate">{s.email}</p>
                      {s.ativo && (
                        <p className="text-xs text-emerald-400 mt-0.5">
                          Aniversário: {bdayStr}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.ativo ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}
                    >
                      {s.ativo ? "Cliente ativo" : "Pendente"}
                    </span>
                    <span className="text-sm text-slate-500">
                      {format(new Date(s.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-700 p-4 bg-slate-900/50">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAtivo(s);
                        }}
                        disabled={togglingId === s.id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${s.ativo ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"}`}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
                      <div><strong className="text-slate-400">Nome completo:</strong> {s.nomeCompleto}</div>
                      <div><strong className="text-slate-400">CPF/RUC/CUIT:</strong> {s.cpfRucCuit}</div>
                      {s.documentoIdentidade && (
                        <div><strong className="text-slate-400">Doc. identidade:</strong> {s.documentoIdentidade}</div>
                      )}
                      <div>
                        <strong className="text-slate-400">Nascimento:</strong>{" "}
                        {format(new Date(s.dataNascimento), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      {s.cidadeNascimento && (
                        <div><strong className="text-slate-400">Cidade nascimento:</strong> {s.cidadeNascimento}</div>
                      )}
                      <div><strong className="text-slate-400">Cidade reside:</strong> {s.cidadeReside}</div>
                      <div><strong className="text-slate-400">Fone:</strong> {s.foneContato || "—"}</div>
                      <div><strong className="text-slate-400">Profissão:</strong> {s.profissao}</div>
                      <div><strong className="text-slate-400">Empresa:</strong> {s.empresaAtual}</div>
                      {s.cargo && <div><strong className="text-slate-400">Cargo:</strong> {s.cargo}</div>}
                      <div><strong className="text-slate-400">Instagram:</strong> {s.instagram}</div>
                      <div><strong className="text-slate-400">Facebook:</strong> {s.facebook}</div>
                      {s.instagramProfissional && (
                        <div><strong className="text-slate-400">Instagram profissional:</strong> {s.instagramProfissional}</div>
                      )}
                      <div><strong className="text-slate-400">Estado civil:</strong> {ESTADO_CIVIL[s.estadoCivil] ?? s.estadoCivil}</div>
                      {s.nomeConjuge && (
                        <div><strong className="text-slate-400">Nome cônjuge:</strong> {s.nomeConjuge}</div>
                      )}
                      {s.dataCasamento && (
                        <div>
                          <strong className="text-slate-400">Data casamento:</strong>{" "}
                          {format(new Date(s.dataCasamento), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      )}
                      <div>
                        <strong className="text-slate-400">Autoriza publicação:</strong>{" "}
                        {s.autorizaPublicacao ? "Sim" : "Não"}
                      </div>
                      {s.outrasInformacoes && (
                        <div className="md:col-span-2">
                          <strong className="text-slate-400">Outras informações:</strong>
                          <p className="mt-1 text-slate-400">{s.outrasInformacoes}</p>
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
