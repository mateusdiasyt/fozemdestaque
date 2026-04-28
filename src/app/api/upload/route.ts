import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role =
      (session?.user?.role as "administrador" | "editor" | "colaborador") ??
      "colaborador";
    const canUpload =
      hasPermission(role, "banners") || hasPermission(role, "posts");

    if (!session?.user || !canUpload) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const kind = formData.get("kind") === "video" ? "video" : "image";

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    const allowedTypes = kind === "video" ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    const maxSize = kind === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            kind === "video"
              ? "Tipo nao permitido. Use: MP4, WebM ou MOV"
              : "Tipo nao permitido. Use: JPEG, PNG, WebP ou GIF",
        },
        { status: 400 }
      );
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error:
            kind === "video"
              ? "Arquivo muito grande. Maximo 50MB"
              : "Arquivo muito grande. Maximo 5MB",
        },
        { status: 400 }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error:
            "BLOB_READ_WRITE_TOKEN nao configurado. Crie um Blob Store no painel da Vercel e adicione a variavel de ambiente.",
        },
        { status: 500 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const pathname = `${kind === "video" ? "videos" : "uploads"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url, kind });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no upload" },
      { status: 500 }
    );
  }
}
