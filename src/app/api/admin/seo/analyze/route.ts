import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth";
import { analyzeSEO } from "@/lib/seo-analyzer";
import { z } from "zod";

const analyzeSchema = z.object({
  title: z.string(),
  content: z.string(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  focusKeyword: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "posts")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = analyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const analysis = analyzeSEO(
    parsed.data.title,
    parsed.data.content,
    parsed.data.metaTitle,
    parsed.data.metaDescription,
    parsed.data.focusKeyword
  );
  return NextResponse.json(analysis);
}
