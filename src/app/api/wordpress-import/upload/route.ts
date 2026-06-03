import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  await request.text().catch(() => "");
  return NextResponse.json(
    {
      error:
        "Upload via Vercel Blob foi desativado. Use /api/upload para enviar arquivos para a VPS.",
    },
    { status: 410 }
  );
}
