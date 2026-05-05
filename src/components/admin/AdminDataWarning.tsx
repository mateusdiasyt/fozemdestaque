interface AdminDataWarningProps {
  title?: string;
  message?: string;
}

export function AdminDataWarning({
  title = "Dados temporariamente indisponiveis",
  message = "O painel abriu em modo seguro porque o banco respondeu com limitacao temporaria. Assim que a cota normalizar, os dados completos voltam automaticamente.",
}: AdminDataWarningProps) {
  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
      <p className="font-semibold text-amber-50">{title}</p>
      <p className="mt-1 leading-6 text-amber-100/90">{message}</p>
    </div>
  );
}
