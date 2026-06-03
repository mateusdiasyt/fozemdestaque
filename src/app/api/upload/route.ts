import { NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { assertEmailStorageAvailable } from "@/lib/email-storage-policy";
import { buildMediaPath, uploadFileToVpsMedia } from "@/lib/vps-media";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
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
  "application/xml",
  "text/plain",
  "text/csv",
  "text/xml",
];

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role =
      (session?.user?.role as "administrador" | "editor" | "colaborador") ??
      "colaborador";
    const canUpload =
      hasPermission(role, "banners") ||
      hasPermission(role, "posts") ||
      hasPermission(role, "emails") ||
      hasPermission(role, "settings");

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
              : "Tipo nao permitido. Use: JPEG, PNG, WebP, GIF, SVG ou ICO",
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

    if (kind === "attachment") {
      const storageError = await assertEmailStorageAvailable(file.size);
      if (storageError) {
        return NextResponse.json({ error: storageError }, { status: 413 });
      }
    }

    const pathname = buildMediaPath({
      kind,
      filename: file.name,
      contentType: file.type,
    });
    const media = await uploadFileToVpsMedia({ file, kind, pathname });

    return NextResponse.json({
      url: media.url,
      path: media.path,
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
