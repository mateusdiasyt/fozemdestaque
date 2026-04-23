import { mergeAttributes, Node } from "@tiptap/core";

export interface ImageGridItem {
  src: string;
  alt?: string;
  href?: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageGrid: {
      setImageGrid: (attrs: { id?: string; columns: number; images: ImageGridItem[] }) => ReturnType;
    };
  }
}

function normalizeColumns(value: unknown) {
  const numeric = Number(value || 3);
  if ([1, 2, 3, 4, 6].includes(numeric)) return numeric;
  return 3;
}

function createImageGridId() {
  return globalThis.crypto?.randomUUID?.() ?? `grid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeImages(value: unknown): ImageGridItem[] {
  if (!Array.isArray(value)) return [];

  const images: ImageGridItem[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const image = item as Partial<ImageGridItem>;
    if (!image.src) return;

    images.push({
      src: String(image.src),
      alt: image.alt ? String(image.alt) : "",
      href: image.href ? String(image.href) : "",
    });
  });

  return images;
}

export const ImageGrid = Node.create({
  name: "imageGrid",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-grid-id"),
        renderHTML: () => ({}),
      },
      columns: {
        default: 3,
        parseHTML: (element) => normalizeColumns(element.getAttribute("data-columns")),
        renderHTML: () => ({}),
      },
      images: {
        default: [],
        renderHTML: () => ({}),
        parseHTML: (element) => {
          const figures = Array.from(element.querySelectorAll("figure"));
          const images: ImageGridItem[] = [];

          figures.forEach((figure) => {
            const img = figure.querySelector("img");
            const link = figure.querySelector("a");
            if (!img?.getAttribute("src")) return;

            images.push({
              src: img.getAttribute("src") || "",
              alt: img.getAttribute("alt") || "",
              href: link?.getAttribute("href") || "",
            });
          });

          return images;
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-image-grid]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const columns = normalizeColumns(HTMLAttributes.columns);
    const images = safeImages(HTMLAttributes.images);
    const gridId = typeof HTMLAttributes.id === "string" ? HTMLAttributes.id : "";
    const gridStyle = [
      "display:grid",
      `grid-template-columns:repeat(${columns},minmax(0,1fr))`,
      "gap:16px",
      "margin:32px 0",
    ].join(";");

    const children = images.map((image, index) => {
      const imageNode = [
        "img",
        {
          src: image.src,
          alt: image.alt || "",
          loading: "lazy",
          style:
            "width:100%;height:100%;min-height:180px;max-height:420px;object-fit:cover;border-radius:18px;display:block;box-shadow:0 14px 34px rgba(15,23,42,.14)",
        },
      ];
      const media = image.href
        ? [
            "a",
            {
              href: image.href,
              target: "_blank",
              rel: "noopener noreferrer",
              style: "display:block;color:inherit;text-decoration:none",
            },
            imageNode,
          ]
        : imageNode;

      return [
        "figure",
        {
          "data-image-index": String(index),
          style:
            "margin:0;min-width:0;border-radius:22px;background:#f8fafc;border:1px solid #e2e8f0;padding:8px",
        },
        media,
        image.alt
          ? [
              "figcaption",
              {
                style:
                  "margin:8px 4px 0;color:#64748b;font-size:13px;line-height:1.45;text-align:center",
              },
              image.alt,
            ]
          : ["span", { style: "display:none" }, ""],
      ];
    });

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-image-grid": "true",
        "data-columns": String(columns),
        ...(gridId ? { "data-grid-id": gridId } : {}),
        class: `foz-image-grid foz-image-grid-${columns}`,
        style: gridStyle,
      }),
      ...children,
    ];
  },

  addCommands() {
    return {
      setImageGrid:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              id: attrs.id || createImageGridId(),
              columns: normalizeColumns(attrs.columns),
              images: safeImages(attrs.images),
            },
          }),
    };
  },
});
