import { NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { birthdaySubmissions } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "aniversarios")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const list = await db
    .select()
    .from(birthdaySubmissions)
    .orderBy(desc(birthdaySubmissions.createdAt));
  return NextResponse.json(list);
}
