import { desc } from "drizzle-orm";
import { AdminDataWarning } from "@/components/admin/AdminDataWarning";
import { AniversariosManager } from "@/components/admin/AniversariosManager";
import { db } from "@/lib/db";
import { birthdaySubmissions } from "@/lib/db/schema";
import { safeAdminQuery } from "@/lib/safe-admin-query";

type BirthdaySubmissionRow = {
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
};

export default async function AdminAniversariosPage() {
  const submissionsResult = await safeAdminQuery<BirthdaySubmissionRow[]>(
    async () => db.select().from(birthdaySubmissions).orderBy(desc(birthdaySubmissions.createdAt)) as Promise<BirthdaySubmissionRow[]>,
    [],
    "birthday submissions"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-100">
          Inscricoes Aniversario / HighSocietyClub
        </h1>
        <p className="text-sm text-slate-400">Gerencie as inscricoes e acompanhe o status dos aniversariantes.</p>
      </div>

      {submissionsResult.unavailable ? <AdminDataWarning /> : null}

      <AniversariosManager submissions={submissionsResult.data} />
    </div>
  );
}
