import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { birthdaySubmissions } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const submitSchema = z.object({
  nomeCompleto: z.string().min(2, "Nome completo obrigatório"),
  cpfRucCuit: z.string().min(5, "CPF/RUC/CUIT obrigatório"),
  documentoIdentidade: z.string().optional(),
  dataNascimento: z.string().min(1, "Data de nascimento obrigatória"),
  cidadeNascimento: z.string().optional(),
  cidadeReside: z.string().min(2, "Cidade onde reside obrigatória"),
  nomeSocial: z.string().min(2, "Nome social obrigatório"),
  foneContato: z.string().optional(),
  email: z.string().email("Email obrigatório"),
  profissao: z.string().min(1, "Profissão obrigatória"),
  empresaAtual: z.string().min(1, "Empresa obrigatória"),
  cargo: z.string().optional(),
  instagram: z.string().min(1, "Instagram obrigatório"),
  facebook: z.string().min(1, "Facebook obrigatório"),
  instagramProfissional: z.string().optional(),
  estadoCivil: z.enum(["casado", "solteiro", "divorciado", "viuvo"]),
  nomeConjuge: z.string().optional(),
  dataCasamento: z.string().optional().nullable(),
  outrasInformacoes: z.string().optional(),
  autorizaPublicacao: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const id = generateId();
    await db.insert(birthdaySubmissions).values({
      id,
      nomeCompleto: data.nomeCompleto,
      cpfRucCuit: data.cpfRucCuit,
      documentoIdentidade: data.documentoIdentidade ?? null,
      dataNascimento: new Date(data.dataNascimento),
      cidadeNascimento: data.cidadeNascimento ?? null,
      cidadeReside: data.cidadeReside,
      nomeSocial: data.nomeSocial,
      foneContato: data.foneContato ?? null,
      email: data.email,
      profissao: data.profissao,
      empresaAtual: data.empresaAtual,
      cargo: data.cargo ?? null,
      instagram: data.instagram,
      facebook: data.facebook,
      instagramProfissional: data.instagramProfissional ?? null,
      estadoCivil: data.estadoCivil,
      nomeConjuge: data.nomeConjuge ?? null,
      dataCasamento: data.dataCasamento ? new Date(data.dataCasamento) : null,
      outrasInformacoes: data.outrasInformacoes ?? null,
      autorizaPublicacao: data.autorizaPublicacao ?? true,
    });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[aniversarios POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao enviar" },
      { status: 500 }
    );
  }
}
