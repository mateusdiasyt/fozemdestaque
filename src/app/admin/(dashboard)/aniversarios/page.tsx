import { db } from "@/lib/db";
import { birthdaySubmissions } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { AniversariosManager } from "@/components/admin/AniversariosManager";

export default async function AdminAniversariosPage() {
  const list = await db
    .select()
    .from(birthdaySubmissions)
    .orderBy(desc(birthdaySubmissions.createdAt));
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100 mb-6 tracking-tight">
        Inscrições Aniversário / HighSocietyClub
      </h1>
      <AniversariosManager submissions={list} />
    </div>
  );
}
