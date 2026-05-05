import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_ATTACHMENT_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
];

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role =
      (session?.user?.role as "administrador" | "editor" | "colaborador") ??
      "colaborador";
    const canUpload =
      hasPermission(role, "banners") || hasPermission(role, "posts") || hasPermission(role, "emails");

    if (!session?.user || !canUpload) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawKind = formData.get("kind");
    const kind =
      rawKind === "video" ? "video" : rawKind === "attachment" ? "attachment" : "image";

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    const allowedTypes =
      kind === "video"
        ? ALLOWED_VIDEO_TYPES
        : kind === "attachment"
          ? ALLOWED_ATTACHMENT_TYPES
          : ALLOWED_IMAGE_TYPES;
    const maxSize =
      kind === "video"
        ? MAX_VIDEO_SIZE
        : kind === "attachment"
          ? MAX_ATTACHMENT_SIZE
          : MAX_IMAGE_SIZE;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            kind === "video"
              ? "Tipo nao permitido. Use: MP4, WebM ou MOV"
              : kind === "attachment"
                ? "Tipo nao permitido para anexo. Use PDF, Office, ZIP, CSV, TXT, imagem ou video compativel."
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
              : kind === "attachment"
                ? "Arquivo muito grande. Maximo 20MB"
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
    const folder =
      kind === "video" ? "videos" : kind === "attachment" ? "email-attachments" : "uploads";
    const pathname = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    });

    return NextResponse.json({
      url: blob.url,
      kind,
      filename: file.name,
      size: file.size,
      contentType: file.type,
    });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no upload" },
      { status: 500 }
    );
  }
}
