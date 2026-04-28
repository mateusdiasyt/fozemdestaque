"use client";

export type PreparedImageUpload = {
  file: File;
  width: number;
  height: number;
  alt: string;
  title: string;
  convertedToWebp: boolean;
};

function humanizeBaseName(filename: string) {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readImageDimensions(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Nao foi possivel ler a imagem."));
      img.src = objectUrl;
    });

    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function convertToWebp(file: File, width: number, height: number) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Nao foi possivel preparar a imagem para WebP."));
      img.src = objectUrl;
    });

    const longEdge = Math.max(width, height);
    const scale = longEdge > 2200 ? 2200 / longEdge : 1;
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return { file, width, height, convertedToWebp: false };
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.84)
    );

    if (!blob) {
      return { file, width, height, convertedToWebp: false };
    }

    const nextFile = new File(
      [blob],
      `${humanizeBaseName(file.name).replace(/\s+/g, "-").toLowerCase() || "imagem"}.webp`,
      {
        type: "image/webp",
        lastModified: Date.now(),
      }
    );

    return {
      file: nextFile,
      width: targetWidth,
      height: targetHeight,
      convertedToWebp: true,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function prepareImageUpload(file: File): Promise<PreparedImageUpload> {
  const altAndTitle = humanizeBaseName(file.name) || "Imagem";
  const { width, height } = await readImageDimensions(file);
  const shouldConvert =
    file.type !== "image/gif" &&
    file.type !== "image/webp" &&
    (file.size > 350 * 1024 || Math.max(width, height) > 1800);

  const converted = shouldConvert
    ? await convertToWebp(file, width, height)
    : { file, width, height, convertedToWebp: false };

  return {
    file: converted.file,
    width: converted.width,
    height: converted.height,
    alt: altAndTitle,
    title: altAndTitle,
    convertedToWebp: converted.convertedToWebp,
  };
}
