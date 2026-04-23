"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mergeAttributes, type JSONContent } from "@tiptap/core";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import {
  ArrowDown,
  ArrowUp,
  Bold,
  CalendarClock,
  Clock3,
  Eye,
  FileText,
  GripVertical,
  Heading2,
  Heading3,
  Heading4,
  HelpCircle,
  ImagePlus,
  Images,
  Italic,
  LayoutGrid,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  PanelRight,
  Plus,
  Quote,
  Save,
  Search,
  Sparkles,
  Table,
  Trash2,
  TrendingUp,
  Undo2,
  Redo2,
  UploadCloud,
  X,
} from "lucide-react";
import { slugify, cn } from "@/lib/utils";
import type { SEOAnalysis } from "@/lib/seo-analyzer";
import { EditorHelpContent } from "./EditorHelpContent";
import { ImageGrid, type ImageGridItem } from "./editor/ImageGridExtension";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  featuredImage?: string | null;
  featuredImageAlt?: string | null;
  categoryId?: string | null;
  status: string;
  featured: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  faqJson?: string | null;
  tags?: string | null;
  scheduledAt?: string | Date | null;
}

interface PostEditorProps {
  post?: Post;
  categories: Category[];
}

const LinkWithRel = Link.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      rel: {
        default: null,
        parseHTML: (el) => el.getAttribute("rel"),
        renderHTML: (attrs) => (attrs.rel ? { rel: attrs.rel } : {}),
      },
    };
  },
});

const ImageWithLink = Image.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      href: {
        default: null,
        parseHTML: (element) => element.closest("a")?.getAttribute("href") ?? element.getAttribute("data-href"),
        renderHTML: () => ({}),
      },
      caption: {
        default: null,
        parseHTML: (element) => element.closest("figure")?.querySelector("figcaption")?.textContent ?? null,
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { href, caption, ...imageAttributes } = HTMLAttributes as Record<string, unknown>;
    const imageNode = [
      "img",
      mergeAttributes(this.options.HTMLAttributes, imageAttributes, {
        "data-editable-image": "true",
      }),
    ];
    const mediaNode = href
      ? [
          "a",
          {
            href: String(href),
            target: "_blank",
            rel: "noopener noreferrer",
            style: "display:block;color:inherit;text-decoration:none",
          },
          imageNode,
        ]
      : imageNode;

    if (!caption) return mediaNode as any;

    return [
      "figure",
      {
        "data-single-image": "true",
        style: "margin:32px 0;text-align:center",
      },
      mediaNode,
      [
        "figcaption",
        {
          style: "margin-top:10px;color:#64748b;font-size:14px;line-height:1.5",
        },
        String(caption),
      ],
    ] as any;
  },
});

const fieldClass =
  "w-full rounded-2xl border border-white/10 bg-[#070d18] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10";
const compactFieldClass =
  "w-full rounded-xl border border-white/10 bg-[#070d18] px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10";
const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400";
const cardClass =
  "rounded-[28px] border border-white/10 bg-[#0b1220]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] ring-1 ring-white/[0.03]";
const seoStatusColors: Record<"good" | "medium" | "bad", string> = {
  good: "text-emerald-300",
  medium: "text-amber-300",
  bad: "text-rose-300",
};

type GalleryColumns = 1 | 2 | 3 | 4 | 6;
type PendingImage = ImageGridItem & {
  id: string;
  fileName: string;
  uploading: boolean;
  error?: string;
};

interface ContentLayer {
  id: string;
  index: number;
  pos: number;
  nodeSize: number;
  type: string;
  label: string;
  preview: string;
}

interface LayerDragState {
  originalIndex: number;
  targetIndex: number;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: ContentLayer;
}

interface SelectedGridImage {
  type: "grid" | "single";
  gridPos?: number;
  imagePos?: number;
  imageIndex: number;
  image: ImageGridItem;
  total: number;
}

const GALLERY_LAYOUTS: Array<{ columns: GalleryColumns; label: string; hint: string }> = [
  { columns: 1, label: "1 coluna", hint: "Uma imagem por linha" },
  { columns: 2, label: "2x2", hint: "Duas colunas amplas" },
  { columns: 3, label: "3x3", hint: "Grade editorial classica" },
  { columns: 4, label: "4x4", hint: "Mais imagens por linha" },
  { columns: 6, label: "6x6", hint: "Mosaico compacto" },
];

export function PostEditor({ post, categories }: PostEditorProps) {
  const router = useRouter();
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  const featuredImageInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage ?? "");
  const [featuredImageAlt, setFeaturedImageAlt] = useState(post?.featuredImageAlt ?? "");
  const [categoryId, setCategoryId] = useState(post?.categoryId ?? "");
  const [status, setStatus] = useState(post?.status ?? "rascunho");
  const [featured, setFeatured] = useState(post?.featured ?? false);
  const [metaTitle, setMetaTitle] = useState(post?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription ?? "");
  const [focusKeyword, setFocusKeyword] = useState(post?.focusKeyword ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(post?.canonicalUrl ?? "");
  const [tags, setTags] = useState(() => {
    if (!post?.tags) return "";
    try {
      const arr = JSON.parse(post.tags);
      return Array.isArray(arr) ? arr.join(", ") : post.tags;
    } catch {
      return post.tags;
    }
  });
  const [scheduledAt, setScheduledAt] = useState(() => {
    const value = post?.scheduledAt;
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().slice(0, 16);
  });
  const [faqItems, setFaqItems] = useState<{ q: string; a: string }[]>([]);
  const [linkPopup, setLinkPopup] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkRel, setLinkRel] = useState<"follow" | "nofollow" | "sponsored">("follow");
  const [imagePopup, setImagePopup] = useState(false);
  const [mediaImages, setMediaImages] = useState<PendingImage[]>([]);
  const [galleryColumns, setGalleryColumns] = useState<GalleryColumns>(3);
  const [uploadingContentImages, setUploadingContentImages] = useState(false);
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis | null>(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [helpPopup, setHelpPopup] = useState(false);
  const [selectedGridImage, setSelectedGridImage] = useState<SelectedGridImage | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setHelpPopup(false);
      setLinkPopup(false);
      setImagePopup(false);
      setSelectedGridImage(null);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    if (!post?.faqJson) return;
    try {
      const parsed = JSON.parse(post.faqJson);
      const mainEntity = parsed["@graph"]?.[0] ?? parsed;
      const faq = mainEntity?.mainEntity ?? [];
      setFaqItems(
        faq.map((item: { name: string; acceptedAnswer: { text: string } }) => ({
          q: item.name,
          a: item.acceptedAnswer?.text ?? "",
        }))
      );
    } catch {
      setFaqItems([]);
    }
  }, [post?.faqJson]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      ImageWithLink.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "rounded-2xl border border-slate-200 shadow-sm" },
      }),
      LinkWithRel.configure({ openOnClick: false, HTMLAttributes: { rel: "follow" } }),
      TableKit,
      ImageGrid,
    ],
    content: post?.content ?? "",
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[620px] bg-[#f8fafc] px-5 py-5 text-slate-900 outline-none sm:px-7 sm:py-7 [&_a]:text-cyan-700 [&_blockquote]:rounded-2xl [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-500 [&_blockquote]:bg-cyan-50 [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:text-slate-700 [&_h1]:text-slate-950 [&_h2]:text-slate-950 [&_h3]:text-slate-950 [&_h4]:text-slate-950 [&_img]:my-6 [&_img]:max-h-[680px] [&_img]:w-full [&_img]:object-contain [&_p]:leading-8 [&_p]:text-slate-800 [&_table]:w-full [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-100 [&_th]:p-2",
      },
    },
  });

  const updateSlugFromTitle = useCallback(() => {
    if (!post && title) setSlug(slugify(title));
  }, [title, post]);

  useEffect(() => {
    updateSlugFromTitle();
  }, [updateSlugFromTitle]);

  const wordCount = editor ? editor.getText().replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length || 0 : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const metaTitleLen = (metaTitle || title).length;
  const metaDescLen = (metaDescription || excerpt).length;
  const metaTitleColor = metaTitleLen <= 50 ? "text-emerald-300" : metaTitleLen <= 60 ? "text-amber-300" : "text-rose-300";
  const metaDescColor = metaDescLen >= 120 && metaDescLen <= 160 ? "text-emerald-300" : metaDescLen >= 100 ? "text-amber-300" : "text-rose-300";
  const displayTitle = metaTitle || title || "Titulo da pagina";
  const displayDesc = metaDescription || excerpt || "Resumo estrategico para atrair o clique no resultado de busca.";
  const previewOrigin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;

    function handleEditorClick(event: MouseEvent) {
      const selection = getSelectedGridImageFromClick(editor, event.target);
      editorDom.querySelectorAll(".foz-editor-selected-image").forEach((element) => {
        element.classList.remove("foz-editor-selected-image");
      });

      if (!selection) {
        setSelectedGridImage(null);
        return;
      }

      const target = event.target instanceof HTMLElement ? event.target : null;
      const imageElement =
        selection.type === "grid"
          ? target?.closest("figure[data-image-index]")
          : target?.closest("img") ?? findSingleImageElement(editor, selection);
      imageElement?.classList.add("foz-editor-selected-image");
      event.preventDefault();
      editor.chain().focus().setNodeSelection(selection.type === "grid" ? selection.gridPos ?? 0 : selection.imagePos ?? 0).run();
      setSelectedGridImage(selection);
    }

    editorDom.addEventListener("click", handleEditorClick);
    return () => editorDom.removeEventListener("click", handleEditorClick);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;
    editorDom.querySelectorAll(".foz-editor-selected-image").forEach((element) => {
      element.classList.remove("foz-editor-selected-image");
    });

    if (!selectedGridImage) return;
    if (selectedGridImage.type === "grid") {
      const grid = findImageGridElement(editor, selectedGridImage);
      grid
        ?.querySelector<HTMLElement>(`figure[data-image-index="${selectedGridImage.imageIndex}"]`)
        ?.classList.add("foz-editor-selected-image");
      return;
    }

    findSingleImageElement(editor, selectedGridImage)?.classList.add("foz-editor-selected-image");
  }, [editor, selectedGridImage]);

  const slugWarnings: string[] = [];
  if (slug.length > 60) slugWarnings.push("URL muito longa (>60 caracteres)");
  if (focusKeyword && slug && !slug.toLowerCase().includes(focusKeyword.toLowerCase())) slugWarnings.push("Keyword nao esta na URL");

  const densityCheck = focusKeyword
    ? {
        h1: title.toLowerCase().includes(focusKeyword.toLowerCase()),
        firstP: (() => {
          const html = editor?.getHTML() ?? "";
          const match = html.replace(/<[^>]+>/g, " ").trim().slice(0, 300);
          return match.toLowerCase().includes(focusKeyword.toLowerCase());
        })(),
        url: slug.toLowerCase().includes(focusKeyword.toLowerCase()),
      }
    : null;

  function openLinkPopup() {
    const { href, rel } = editor?.getAttributes("link") ?? {};
    setLinkUrl(href ?? "");
    setLinkRel((rel === "nofollow" ? "nofollow" : rel === "sponsored" ? "sponsored" : "follow") as "follow" | "nofollow" | "sponsored");
    setLinkPopup(true);
  }

  function applyLink() {
    if (linkUrl) {
      const relVal = linkRel === "follow" ? null : linkRel;
      editor?.chain().focus().extendMarkRange("link").setLink({ href: linkUrl, rel: relVal }).run();
    }
    setLinkPopup(false);
    setLinkUrl("");
  }

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Erro ao enviar imagem");
    return data.url as string;
  }

  async function handleContentImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (files.length === 0) return;
    const pendingImages: PendingImage[] = files.map((file) => ({
      id: crypto.randomUUID(),
      src: "",
      fileName: file.name,
      alt: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
      href: "",
      caption: "",
      uploading: true,
    }));

    setMediaImages((current) => [...current, ...pendingImages]);
    setUploadingContentImages(true);
    setUploadError("");

    await Promise.all(
      files.map(async (file, index) => {
        const imageId = pendingImages[index].id;
        try {
          const url = await uploadImage(file);
          setMediaImages((current) =>
            current.map((image) =>
              image.id === imageId ? { ...image, src: url, uploading: false } : image
            )
          );
        } catch (err) {
          setMediaImages((current) =>
            current.map((image) =>
              image.id === imageId
                ? {
                    ...image,
                    uploading: false,
                    error: err instanceof Error ? err.message : "Nao foi possivel enviar a imagem",
                  }
                : image
            )
          );
        }
      })
    );

    setUploadingContentImages(false);
  }

  async function handleFeaturedImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setUploadingFeaturedImage(true);
    setUploadError("");
    try {
      const url = await uploadImage(file);
      setFeaturedImage(url);
      if (!featuredImageAlt.trim()) setFeaturedImageAlt(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Nao foi possivel enviar a imagem");
    } finally {
      setUploadingFeaturedImage(false);
    }
  }

  function insertImageIntoContent() {
    const readyImages = mediaImages
      .filter((image) => image.src && !image.uploading && !image.error)
      .map((image) => ({
        src: image.src,
        alt: image.alt?.trim() || "",
        href: image.href?.trim() || "",
        caption: image.caption?.trim() || "",
      }));

    if (readyImages.length === 0 || !editor) return;
    editor.chain().focus().setImageGrid({ columns: galleryColumns, images: readyImages }).run();
    setImagePopup(false);
    setMediaImages([]);
  }

  function updateSelectedGridImage(patch: Partial<ImageGridItem>) {
    if (!editor || !selectedGridImage) return;
    if (selectedGridImage.type === "single") {
      const imagePos = selectedGridImage.imagePos;
      if (typeof imagePos !== "number") return;
      const node = editor.state.doc.nodeAt(imagePos);
      if (!node || node.type.name !== "image") return;

      const nextImage = {
        src: String(node.attrs.src || ""),
        alt: String(patch.alt ?? node.attrs.alt ?? ""),
        href: String(patch.href ?? node.attrs.href ?? ""),
        caption: String(patch.caption ?? node.attrs.caption ?? ""),
      };

      editor
        .chain()
        .focus()
        .command(({ tr, dispatch }) => {
          dispatch?.(tr.setNodeMarkup(imagePos, undefined, { ...node.attrs, ...patch }));
          return true;
        })
        .run();

      setSelectedGridImage({
        ...selectedGridImage,
        image: nextImage,
      });
      return;
    }

    const gridPos = selectedGridImage.gridPos;
    if (typeof gridPos !== "number") return;
    const node = editor.state.doc.nodeAt(gridPos);
    if (!node || node.type.name !== "imageGrid") return;

    const images = safeImageGridItems(node.attrs.images);
    if (!images[selectedGridImage.imageIndex]) return;

    const nextImages = images.map((image, index) =>
      index === selectedGridImage.imageIndex ? { ...image, ...patch } : image
    );

    editor
      .chain()
      .focus()
      .command(({ tr, dispatch }) => {
        dispatch?.(tr.setNodeMarkup(gridPos, undefined, { ...node.attrs, images: nextImages }));
        return true;
      })
      .run();

    setSelectedGridImage({
      ...selectedGridImage,
      image: nextImages[selectedGridImage.imageIndex],
      total: nextImages.length,
    });
  }

  function addFaqItem() {
    setFaqItems([...faqItems, { q: "", a: "" }]);
  }

  function updateFaqItem(i: number, field: "q" | "a", val: string) {
    const next = [...faqItems];
    next[i] = { ...next[i], [field]: val };
    setFaqItems(next);
  }

  function removeFaqItem(i: number) {
    setFaqItems(faqItems.filter((_, idx) => idx !== i));
  }

  function buildFaqJson(): string | null {
    const valid = faqItems.filter((x) => x.q.trim() && x.a.trim());
    if (valid.length === 0) return null;
    const ld = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: valid.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    };
    return JSON.stringify(ld);
  }

  async function analyzeSEO() {
    const content = editor?.getHTML() ?? "";
    if (!title || !content) return;
    setSeoLoading(true);
    try {
      const res = await fetch("/api/admin/seo/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, metaTitle: metaTitle || undefined, metaDescription: metaDescription || undefined, focusKeyword: focusKeyword || undefined }),
      });
      const data = await res.json();
      setSeoAnalysis(data);
    } finally {
      setSeoLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (featuredImage && !featuredImageAlt?.trim()) {
      alert("Alt Text da imagem de destaque e obrigatorio para SEO.");
      return;
    }
    setLoading(true);
    try {
      const body = {
        title,
        slug: slug || slugify(title),
        excerpt: excerpt || undefined,
        content: editor?.getHTML() ?? "",
        featuredImage: featuredImage || undefined,
        featuredImageAlt: featuredImageAlt?.trim() || undefined,
        categoryId: categoryId || undefined,
        status,
        featured,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
        focusKeyword: focusKeyword || undefined,
        canonicalUrl: canonicalUrl || undefined,
        faqJson: buildFaqJson(),
        tags: tags ? JSON.stringify(tags.split(",").map((t) => t.trim()).filter(Boolean)) : undefined,
        scheduledAt: scheduledAt || undefined,
      };
      const url = post ? `/api/admin/posts/${post.id}` : "/api/admin/posts";
      const method = post ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err?.error?.message ?? "Erro ao salvar");
        return;
      }
      if (!post) {
        const data = await res.json();
        router.push(`/admin/posts/${data.id}`);
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-10 text-slate-100">
      <input ref={contentImageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleContentImageUpload} />
      <input ref={featuredImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFeaturedImageUpload} />

      <div className="rounded-[30px] border border-white/10 bg-gradient-to-br from-[#111a2b] via-[#0b1220] to-[#070b14] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.32)] sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-3">
            <MetricPill icon={<FileText className="h-4 w-4" />} label="Palavras" value={wordCount.toString()} />
            <MetricPill icon={<Clock3 className="h-4 w-4" />} label="Leitura" value={`~${readTime} min`} />
            <MetricPill icon={<Sparkles className="h-4 w-4" />} label="Status" value={status.replace("_", " ")} />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setHelpPopup(true)} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/5">
              <HelpCircle className="h-4 w-4" />
              Ajuda
            </button>
            {post && (
              <a href={`/post/${post.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/5">
                <Eye className="h-4 w-4" />
                Visualizar
              </a>
            )}
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_18px_50px_rgba(103,232,249,0.18)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {post ? "Salvar alteracoes" : "Criar post"}
            </button>
          </div>
        </div>
      </div>

      {uploadError && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{uploadError}</div>}

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_410px]">
        <section className={cn(cardClass, "space-y-6 p-5 sm:p-7")}>
          <div className="flex flex-col gap-2 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">Estudio editorial</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Construa a materia</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-400">Escreva, organize imagens no corpo do texto e prepare SEO sem sair da mesma tela.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div>
              <label className={labelClass}>Titulo</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Headline da materia" className="w-full rounded-[22px] border border-white/10 bg-[#070d18] px-5 py-4 text-2xl font-semibold tracking-tight text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10 sm:text-3xl" />
            </div>
            <div>
              <label className={labelClass}>URL amigavel</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className={fieldClass} placeholder="url-amigavel" />
              {slugWarnings.length > 0 && <p className="mt-2 text-xs text-amber-200">{slugWarnings.join(" | ")}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass}>Resumo editorial</label>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} className={cn(fieldClass, "min-h-[112px] resize-y leading-6")} placeholder="Um paragrafo curto que aparece nos cards, chamadas e SEO quando nao houver meta description." />
          </div>

          <div>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className={labelClass}>Conteudo</label>
                <p className="text-sm text-slate-400">Use titulos, links, tabelas, citacoes e imagens no meio da materia.</p>
              </div>
              <button type="button" onClick={() => setImagePopup(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20">
                <ImagePlus className="h-4 w-4" />
                Inserir imagem
              </button>
            </div>
            <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
              <ContentLayers editor={editor} />
              <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#edf2f7] shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
                <EditorToolbar editor={editor} onLinkClick={openLinkPopup} onImageClick={() => setImagePopup(true)} />
                <EditorContent editor={editor} />
                {selectedGridImage && (
                  <ImageInlineSettings
                    selection={selectedGridImage}
                    onClose={() => setSelectedGridImage(null)}
                    onUpdate={updateSelectedGridImage}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-5 2xl:sticky 2xl:top-6 2xl:self-start">
          <section className={cardClass}>
            <SidebarTitle icon={<PanelRight className="h-4 w-4" />} eyebrow="Workflow" title="Publicacao" />
            <div className="mt-5 space-y-4">
              <div>
                <label className={labelClass}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}>
                  <option value="rascunho">Rascunho</option>
                  <option value="em_analise">Em analise</option>
                  <option value="publicado">Publicado</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Categoria</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={fieldClass}>
                  <option value="">Selecione</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Agendar</label>
                <div className="relative">
                  <CalendarClock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={cn(fieldClass, "pl-11")} />
                </div>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200">
                <span>Destaque na home</span>
                <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 accent-cyan-300" />
              </label>
              <div>
                <label className={labelClass}>Tags</label>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="sociedade, agenda, foz" className={fieldClass} />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <SidebarTitle icon={<ImagePlus className="h-4 w-4" />} eyebrow="Midia" title="Imagem de destaque" />
            <div className="mt-5 space-y-4">
              <button type="button" onClick={() => featuredImageInputRef.current?.click()} disabled={uploadingFeaturedImage} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-300/10 px-4 py-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60">
                {uploadingFeaturedImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                {uploadingFeaturedImage ? "Enviando imagem..." : "Enviar imagem"}
              </button>
              <div>
                <label className={labelClass}>Ou cole uma URL</label>
                <input type="url" value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} placeholder="https://..." className={fieldClass} />
              </div>
              {featuredImage && (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={featuredImage} alt="" className="h-44 w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                </div>
              )}
              <div>
                <label className={labelClass}>Alt text obrigatorio</label>
                <input type="text" value={featuredImageAlt} onChange={(e) => setFeaturedImageAlt(e.target.value)} placeholder="Descreva objetivamente a imagem" className={fieldClass} />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <div className="flex items-start justify-between gap-3">
              <SidebarTitle icon={<Search className="h-4 w-4" />} eyebrow="Performance" title="SEO" />
              <button type="button" onClick={analyzeSEO} disabled={seoLoading} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-60">
                {seoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
                Analisar
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-xs text-slate-400"><span>Meta title</span><span className={cn("font-semibold", metaTitleColor)}>{metaTitleLen}/60</span></div>
                <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70} placeholder={title || "Titulo da pagina"} className={compactFieldClass} />
              </div>
              <div>
                <div className="mb-2 flex justify-between text-xs text-slate-400"><span>Meta description</span><span className={cn("font-semibold", metaDescColor)}>{metaDescLen}/160</span></div>
                <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} maxLength={165} rows={3} className={cn(compactFieldClass, "min-h-[92px] resize-y")} />
              </div>
              <div>
                <label className={labelClass}>Palavra-chave foco</label>
                <input type="text" value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} className={compactFieldClass} />
              </div>
              <div>
                <label className={labelClass}>Canonical URL</label>
                <input type="url" value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://..." className={compactFieldClass} />
              </div>
              <details className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-200">Preview e analise</summary>
                <div className="mt-4 space-y-3 text-xs">
                  <div className="rounded-2xl border border-white/10 bg-[#070d18] p-4">
                    <p className="truncate font-semibold text-cyan-200">{displayTitle}</p>
                    <p className="mt-1 text-emerald-300">{previewOrigin}/post/{slug || "url"}</p>
                    <p className="mt-2 line-clamp-3 text-slate-400">{displayDesc}</p>
                  </div>
                  {densityCheck && focusKeyword && (
                    <div className="rounded-2xl border border-white/10 bg-[#070d18] p-4 text-slate-300">
                      <p className={densityCheck.h1 ? "text-emerald-300" : "text-slate-500"}>H1: {densityCheck.h1 ? "ok" : "pendente"}</p>
                      <p className={densityCheck.firstP ? "text-emerald-300" : "text-slate-500"}>Primeiro paragrafo: {densityCheck.firstP ? "ok" : "pendente"}</p>
                      <p className={densityCheck.url ? "text-emerald-300" : "text-slate-500"}>URL: {densityCheck.url ? "ok" : "pendente"}</p>
                    </div>
                  )}
                  {seoAnalysis && (
                    <div className="rounded-2xl border border-white/10 bg-[#070d18] p-4 text-slate-300">
                      <p className={cn("font-semibold", seoStatusColors[seoAnalysis.overall])}>SEO: {seoAnalysis.overall === "good" ? "Bom" : seoAnalysis.overall === "medium" ? "Medio" : "Ruim"}</p>
                      <p className={seoStatusColors[seoAnalysis.metaTitle.status]}>{seoAnalysis.metaTitle.message}</p>
                      <p className={seoStatusColors[seoAnalysis.metaDescription.status]}>{seoAnalysis.metaDescription.message}</p>
                    </div>
                  )}
                </div>
              </details>
            </div>
          </section>

          <details className={cn(cardClass, "group p-0")}>
            <summary className="cursor-pointer list-none p-5">
              <SidebarTitle icon={<Sparkles className="h-4 w-4" />} eyebrow="Schema" title="FAQ JSON-LD" />
            </summary>
            <div className="space-y-3 border-t border-white/10 px-5 pb-5 pt-4">
              <p className="text-sm text-slate-400">Perguntas e respostas podem ajudar o Google a entender melhor a materia.</p>
              {faqItems.map((item, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <input type="text" value={item.q} onChange={(e) => updateFaqItem(i, "q", e.target.value)} placeholder="Pergunta" className={compactFieldClass} />
                      <textarea value={item.a} onChange={(e) => updateFaqItem(i, "a", e.target.value)} placeholder="Resposta" rows={2} className={cn(compactFieldClass, "min-h-[80px] resize-y")} />
                    </div>
                    <button type="button" onClick={() => removeFaqItem(i)} className="rounded-xl p-2 text-rose-200 transition hover:bg-rose-500/10" aria-label="Remover FAQ">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addFaqItem} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">
                <Plus className="h-4 w-4" />
                Adicionar FAQ
              </button>
            </div>
          </details>
        </aside>
      </div>

      {helpPopup && (
        <DialogShell onClose={() => setHelpPopup(false)} label="Fechar ajuda">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1220] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Guia rapido</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Editor de posts</h2>
              </div>
              <button type="button" onClick={() => setHelpPopup(false)} className="rounded-xl p-2 text-slate-300 hover:bg-white/10" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
              <EditorHelpContent />
            </div>
          </div>
        </DialogShell>
      )}

      {linkPopup && (
        <DialogShell onClose={() => setLinkPopup(false)} label="Fechar link">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b1220] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Link</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Inserir link</h3>
              </div>
              <button type="button" onClick={() => setLinkPopup(false)} className="rounded-xl p-2 text-slate-300 hover:bg-white/10" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className={fieldClass} autoFocus />
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(["follow", "nofollow", "sponsored"] as const).map((rel) => (
                <label key={rel} className={cn("cursor-pointer rounded-2xl border px-3 py-2 text-center text-xs font-semibold transition", linkRel === rel ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100" : "border-white/10 text-slate-400 hover:bg-white/5")}>
                  <input type="radio" checked={linkRel === rel} onChange={() => setLinkRel(rel)} className="sr-only" />
                  {rel}
                </label>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={applyLink} className="rounded-2xl bg-cyan-200 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-white">Aplicar</button>
              <button type="button" onClick={() => setLinkPopup(false)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">Cancelar</button>
            </div>
          </div>
        </DialogShell>
      )}

      {imagePopup && (
        <MediaDialog
          galleryColumns={galleryColumns}
          images={mediaImages}
          onClose={() => setImagePopup(false)}
          onInsert={insertImageIntoContent}
          onPickFiles={() => contentImageInputRef.current?.click()}
          onRemoveImage={(id) => setMediaImages((current) => current.filter((image) => image.id !== id))}
          onReorderImage={(fromIndex, toIndex) =>
            setMediaImages((current) => reorderList(current, fromIndex, toIndex))
          }
          onUpdateColumns={setGalleryColumns}
          uploading={uploadingContentImages}
        />
      )}
    </form>
  );
}

function ImageInlineSettings({
  selection,
  onClose,
  onUpdate,
}: {
  selection: SelectedGridImage;
  onClose: () => void;
  onUpdate: (patch: Partial<ImageGridItem>) => void;
}) {
  const image = selection.image;

  return (
    <div
      className="absolute right-4 top-16 z-30 w-[min(360px,calc(100%-2rem))] rounded-[24px] border border-slate-200 bg-white p-4 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-700">Imagem selecionada</p>
          <h3 className="mt-1 text-base font-semibold">
            {selection.type === "grid" ? `Imagem ${selection.imageIndex + 1} de ${selection.total}` : "Imagem do conteudo"}
          </h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" aria-label="Fechar ajustes da imagem">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt="" className="h-36 w-full object-cover" />
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Texto alternativo</label>
          <input
            value={image.alt || ""}
            onChange={(event) => onUpdate({ alt: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            placeholder="Descreva a imagem para acessibilidade e SEO"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Link na imagem</label>
          <input
            value={image.href || ""}
            onChange={(event) => onUpdate({ href: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Legenda</label>
          <input
            value={image.caption || ""}
            onChange={(event) => onUpdate({ caption: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            placeholder="Texto exibido abaixo da imagem"
          />
        </div>
      </div>
    </div>
  );
}

function ContentLayers({ editor }: { editor: Editor | null }) {
  const [layers, setLayers] = useState<ContentLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState("");
  const [layerDrag, setLayerDrag] = useState<LayerDragState | null>(null);
  const layerRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!editor) {
      setLayers([]);
      return;
    }

    const refresh = () => {
      const nextLayers = getEditorLayers(editor);
      const selectionFrom = editor.state.selection.from;
      const active = nextLayers.find(
        (layer) => selectionFrom >= layer.pos && selectionFrom <= layer.pos + layer.nodeSize
      );
      setLayers(nextLayers);
      setActiveLayerId(active?.id ?? "");
    };

    refresh();
    editor.on("update", refresh);
    editor.on("transaction", refresh);

    return () => {
      editor.off("update", refresh);
      editor.off("transaction", refresh);
    };
  }, [editor]);

  useEffect(() => {
    if (!layerDrag) return;
    const pointerId = layerDrag.pointerId;

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();
      setLayerDrag((current) => {
        if (!current) return null;
        const targetIndex = getLayerDropIndex(layers, layerRefs.current, current.originalIndex, event.clientY);
        return {
          ...current,
          x: event.clientX - current.offsetX,
          y: event.clientY - current.offsetY,
          targetIndex,
        };
      });
    }

    function finishDrag(event: PointerEvent) {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();
      setLayerDrag((current) => {
        if (current && current.targetIndex !== current.originalIndex) {
          moveLayer(current.originalIndex, current.targetIndex);
        }
        return null;
      });
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };
  }, [layerDrag?.pointerId, layers]);

  const activeLayer = layers.find((layer) => layer.id === activeLayerId) ?? null;
  const activeNode = activeLayer && editor ? editor.state.doc.nodeAt(activeLayer.pos) : null;
  const activeImages = activeNode?.type.name === "imageGrid" ? safeImageGridItems(activeNode.attrs.images) : [];
  const visibleLayers = layerDrag ? reorderList(layers, layerDrag.originalIndex, layerDrag.targetIndex) : layers;

  function selectLayer(layer: ContentLayer) {
    if (!editor) return;
    setActiveLayerId(layer.id);
    if (["image", "imageGrid", "horizontalRule", "table"].includes(layer.type)) {
      editor.chain().focus().setNodeSelection(layer.pos).run();
      return;
    }
    editor.chain().focus().setTextSelection(layer.pos).run();
  }

  function moveLayer(fromIndex: number, toIndex: number) {
    if (!editor || fromIndex === toIndex) return;
    moveEditorLayer(editor, fromIndex, toIndex);
  }

  function setLayerRef(layerId: string, element: HTMLDivElement | null) {
    if (element) {
      layerRefs.current.set(layerId, element);
      return;
    }
    layerRefs.current.delete(layerId);
  }

  function startLayerDrag(event: React.PointerEvent, layer: ContentLayer) {
    if (event.button !== 0) return;
    const card = layerRefs.current.get(layer.id);
    if (!card) return;

    const rect = card.getBoundingClientRect();
    event.preventDefault();
    event.stopPropagation();
    selectLayer(layer);
    setLayerDrag({
      originalIndex: layer.index,
      targetIndex: layer.index,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      layer,
    });
  }

  function updateImageGridAttrs(patch: { columns?: number; images?: ImageGridItem[] }) {
    if (!editor || !activeLayer) return;
    editor
      .chain()
      .focus()
      .command(({ state, tr, dispatch }) => {
        const node = state.doc.nodeAt(activeLayer.pos);
        if (!node || node.type.name !== "imageGrid") return false;
        dispatch?.(tr.setNodeMarkup(activeLayer.pos, undefined, { ...node.attrs, ...patch }));
        return true;
      })
      .run();
  }

  function reorderActiveImage(fromIndex: number, toIndex: number) {
    updateImageGridAttrs({ images: reorderList(activeImages, fromIndex, toIndex) });
  }

  function removeActiveImage(index: number) {
    updateImageGridAttrs({ images: activeImages.filter((_, imageIndex) => imageIndex !== index) });
  }

  return (
    <aside className="rounded-[24px] border border-white/10 bg-[#070d18] p-4 text-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Camadas</p>
          <h3 className="mt-1 text-sm font-semibold text-white">Corpo da materia</h3>
        </div>
        <GripVertical className="h-5 w-5 text-slate-600" />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Puxe os blocos para reorganizar textos, galerias e tabelas dentro do conteudo.
      </p>

      <div className="mt-4 max-h-[470px] space-y-2 overflow-y-auto pr-1">
        {layers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">
            Comece escrevendo para ver as camadas aqui.
          </div>
        ) : (
          visibleLayers.map((layer) => {
            const active = layer.id === activeLayerId;
            const dragging = layerDrag?.layer.id === layer.id;
            return (
              <div
                key={layer.id}
                ref={(element) => setLayerRef(layer.id, element)}
                style={dragging ? { minHeight: layerDrag.height } : undefined}
                className={cn(
                  "group rounded-2xl border p-3 transition",
                  dragging && "pointer-events-none opacity-0",
                  layerDrag && !dragging && "duration-150",
                  active
                    ? "border-cyan-300/50 bg-cyan-300/15"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                )}
              >
                <button type="button" onClick={() => selectLayer(layer)} className="w-full text-left">
                  <div className="flex items-start gap-2">
                    <span
                      onPointerDown={(event) => startLayerDrag(event, layer)}
                      className="mt-0.5 inline-flex h-5 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-slate-600 transition hover:bg-white/10 hover:text-cyan-100 active:cursor-grabbing"
                      aria-label="Arrastar camada"
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">{layer.label}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{layer.preview}</p>
                    </div>
                  </div>
                </button>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveLayer(layer.index, Math.max(0, layer.index - 1))}
                    disabled={layer.index === 0}
                    className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/10 disabled:opacity-30"
                    aria-label="Mover camada para cima"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLayer(layer.index, Math.min(layers.length - 1, layer.index + 1))}
                    disabled={layer.index === layers.length - 1}
                    className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/10 disabled:opacity-30"
                    aria-label="Mover camada para baixo"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {layerDrag && (
        <div
          className="pointer-events-none fixed z-[80] rounded-2xl border border-cyan-300/60 bg-[#101827] p-3 text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.45)] ring-1 ring-cyan-200/20"
          style={{
            left: layerDrag.x,
            top: layerDrag.y,
            width: layerDrag.width,
            minHeight: layerDrag.height,
          }}
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-cyan-300/10 text-cyan-100">
              <GripVertical className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">{layerDrag.layer.label}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{layerDrag.layer.preview}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 opacity-50">
            <span className="rounded-lg border border-white/10 p-1.5 text-slate-400">
              <ArrowUp className="h-3.5 w-3.5" />
            </span>
            <span className="rounded-lg border border-white/10 p-1.5 text-slate-400">
              <ArrowDown className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      )}

      {activeNode?.type.name === "imageGrid" && (
        <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Editar galeria</p>
          <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Grade</label>
          <select
            value={Number(activeNode.attrs.columns || 3)}
            onChange={(event) => updateImageGridAttrs({ columns: Number(event.target.value) })}
            className={cn(compactFieldClass, "mt-1")}
          >
            {GALLERY_LAYOUTS.map((layout) => (
              <option key={layout.columns} value={layout.columns}>{layout.label}</option>
            ))}
          </select>
          <div className="mt-3 max-h-[280px] space-y-3 overflow-y-auto pr-1">
            {activeImages.map((image, index) => (
              <div key={`${image.src}-${index}`} className="rounded-xl border border-white/10 bg-[#070d18] p-2">
                <div className="flex items-start gap-2">
                  <div className="h-12 w-14 shrink-0 overflow-hidden rounded-lg bg-black/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Imagem {index + 1}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                      Clique na imagem dentro do editor para ajustar alt text, link e legenda.
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => reorderActiveImage(index, Math.max(0, index - 1))}
                      disabled={index === 0}
                      className="rounded-lg border border-white/10 p-1 text-slate-400 hover:bg-white/10 disabled:opacity-30"
                      aria-label="Mover imagem para cima"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => reorderActiveImage(index, Math.min(activeImages.length - 1, index + 1))}
                      disabled={index === activeImages.length - 1}
                      className="rounded-lg border border-white/10 p-1 text-slate-400 hover:bg-white/10 disabled:opacity-30"
                      aria-label="Mover imagem para baixo"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeActiveImage(index)}
                      className="rounded-lg border border-rose-300/20 p-1 text-rose-200 hover:bg-rose-500/10"
                      aria-label="Remover imagem da galeria"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function getSelectedGridImageFromClick(editor: Editor, target: EventTarget | null): SelectedGridImage | null {
  if (!(target instanceof HTMLElement)) return null;
  const figure = target.closest<HTMLElement>("figure[data-image-index]");
  const grid = figure?.closest<HTMLElement>("[data-image-grid]");
  if (!figure || !grid || !editor.view.dom.contains(grid)) {
    return getSelectedSingleImageFromClick(editor, target);
  }

  const imageIndex = Number(figure.dataset.imageIndex);
  if (!Number.isInteger(imageIndex) || imageIndex < 0) return null;

  const gridId = grid.getAttribute("data-grid-id") || "";
  const domSources = Array.from(grid.querySelectorAll<HTMLImageElement>("img")).map((image) => image.getAttribute("src") || "");
  let selected: SelectedGridImage | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "imageGrid") return true;
    const images = safeImageGridItems(node.attrs.images);
    const nodeGridId = typeof node.attrs.id === "string" ? node.attrs.id : "";
    const sameGridId = Boolean(gridId && nodeGridId && gridId === nodeGridId);
    const sameSources = !gridId && isSameStringList(images.map((image) => image.src), domSources);

    if (!sameGridId && !sameSources) return true;
    const image = images[imageIndex];
    if (!image) return false;
    selected = {
      type: "grid",
      gridPos: pos,
      imageIndex,
      image,
      total: images.length,
    };
    return false;
  });

  return selected;
}

function getSelectedSingleImageFromClick(editor: Editor, target: HTMLElement): SelectedGridImage | null {
  const imageElement = target.closest<HTMLImageElement>("img");
  if (!imageElement || imageElement.closest("[data-image-grid]") || !editor.view.dom.contains(imageElement)) return null;

  const nodeMatch = findImageNodeFromDom(editor, imageElement);
  if (!nodeMatch) return null;

  return {
    type: "single",
    gridPos: undefined,
    imagePos: nodeMatch.pos,
    imageIndex: 0,
    image: {
      src: String(nodeMatch.node.attrs.src || ""),
      alt: String(nodeMatch.node.attrs.alt || ""),
      href: String(nodeMatch.node.attrs.href || ""),
      caption: String(nodeMatch.node.attrs.caption || ""),
    },
    total: 1,
  };
}

function findImageNodeFromDom(editor: Editor, imageElement: HTMLImageElement) {
  const maybePos = editor.view.posAtDOM(imageElement, 0);
  const candidatePositions = [maybePos, maybePos - 1, maybePos + 1].filter(
    (pos) => pos >= 0 && pos <= editor.state.doc.content.size
  );

  for (const pos of candidatePositions) {
    const node = editor.state.doc.nodeAt(pos);
    if (node?.type.name === "image") return { pos, node };
  }

  const singleImages = Array.from(editor.view.dom.querySelectorAll<HTMLImageElement>("img")).filter(
    (image) => !image.closest("[data-image-grid]")
  );
  const imageDomIndex = singleImages.indexOf(imageElement);
  if (imageDomIndex < 0) return null;

  let currentImageIndex = -1;
  let match: { pos: number; node: NonNullable<ReturnType<typeof editor.state.doc.nodeAt>> } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "image") return true;
    currentImageIndex += 1;
    if (currentImageIndex !== imageDomIndex) return true;
    match = { pos, node };
    return false;
  });

  return match;
}

function findImageGridElement(editor: Editor, selection: SelectedGridImage) {
  if (selection.type !== "grid" || typeof selection.gridPos !== "number") return null;
  const node = editor.state.doc.nodeAt(selection.gridPos);
  if (!node || node.type.name !== "imageGrid") return null;

  const images = safeImageGridItems(node.attrs.images);
  const nodeGridId = typeof node.attrs.id === "string" ? node.attrs.id : "";
  const grids = Array.from(editor.view.dom.querySelectorAll<HTMLElement>("[data-image-grid]"));

  return (
    grids.find((grid) => {
      const gridId = grid.getAttribute("data-grid-id") || "";
      if (nodeGridId && gridId === nodeGridId) return true;
      const domSources = Array.from(grid.querySelectorAll<HTMLImageElement>("img")).map((image) => image.getAttribute("src") || "");
      return isSameStringList(images.map((image) => image.src), domSources);
    }) ?? null
  );
}

function findSingleImageElement(editor: Editor, selection: SelectedGridImage) {
  if (selection.type !== "single" || typeof selection.imagePos !== "number") return null;
  const dom = editor.view.nodeDOM(selection.imagePos);
  if (dom instanceof HTMLImageElement) return dom;
  if (dom instanceof HTMLElement) return dom.querySelector<HTMLImageElement>("img");
  return null;
}

function isSameStringList(first: string[], second: string[]) {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function getEditorLayers(editor: Editor): ContentLayer[] {
  const layers: ContentLayer[] = [];

  editor.state.doc.forEach((node, offset, index) => {
    const pos = offset + 1;
    layers.push({
      id: `${index}-${node.type.name}-${pos}-${node.nodeSize}`,
      index,
      pos,
      nodeSize: node.nodeSize,
      type: node.type.name,
      label: getLayerLabel(node.type.name, node.attrs),
      preview: getLayerPreview(node.type.name, node.textContent, node.attrs),
    });
  });

  return layers;
}

function getLayerLabel(type: string, attrs: Record<string, unknown>) {
  if (type === "heading") return `Titulo H${attrs.level || 2}`;
  if (type === "paragraph") return "Texto";
  if (type === "imageGrid") return "Galeria";
  if (type === "image") return "Imagem";
  if (type === "blockquote") return "Citacao";
  if (type === "bulletList") return "Lista";
  if (type === "orderedList") return "Lista numerada";
  if (type === "table") return "Tabela";
  if (type === "horizontalRule") return "Divisoria";
  return type;
}

function getLayerPreview(type: string, text: string, attrs: Record<string, unknown>) {
  if (type === "imageGrid") {
    const images = safeImageGridItems(attrs.images);
    return `${images.length} imagens em grade ${attrs.columns || 3}x${attrs.columns || 3}`;
  }
  if (type === "image") return String(attrs.alt || attrs.src || "Imagem sem descricao");
  return text?.trim() || "Camada vazia";
}

function safeImageGridItems(value: unknown): ImageGridItem[] {
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
      caption: image.caption ? String(image.caption) : "",
    });
  });

  return images;
}

function moveEditorLayer(editor: Editor, fromIndex: number, toIndex: number) {
  const json = editor.getJSON() as JSONContent;
  const content = Array.isArray(json.content) ? [...json.content] : [];
  if (!content[fromIndex] || toIndex < 0 || toIndex >= content.length) return;

  const [moved] = content.splice(fromIndex, 1);
  content.splice(toIndex, 0, moved);
  editor.commands.setContent({ ...json, content });
}

function getLayerDropIndex(
  layers: ContentLayer[],
  refs: Map<string, HTMLDivElement>,
  originalIndex: number,
  clientY: number
) {
  const layerRects = layers
    .filter((layer) => layer.index !== originalIndex)
    .map((layer) => {
      const rect = refs.get(layer.id)?.getBoundingClientRect();
      return rect ? { rect } : null;
    })
    .filter((item): item is { rect: DOMRect } => Boolean(item))
    .sort((a, b) => a.rect.top - b.rect.top);

  const targetIndex = layerRects.findIndex(({ rect }) => clientY < rect.top + rect.height / 2);
  return targetIndex === -1 ? layerRects.length : targetIndex;
}

function reorderList<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || !items[fromIndex] || toIndex < 0 || toIndex >= items.length) return items;
  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

function MediaDialog({
  galleryColumns,
  images,
  onClose,
  onInsert,
  onPickFiles,
  onRemoveImage,
  onReorderImage,
  onUpdateColumns,
  uploading,
}: {
  galleryColumns: GalleryColumns;
  images: PendingImage[];
  onClose: () => void;
  onInsert: () => void;
  onPickFiles: () => void;
  onRemoveImage: (id: string) => void;
  onReorderImage: (fromIndex: number, toIndex: number) => void;
  onUpdateColumns: (columns: GalleryColumns) => void;
  uploading: boolean;
}) {
  const [draggingImageIndex, setDraggingImageIndex] = useState<number | null>(null);
  const readyCount = images.filter((image) => image.src && !image.uploading && !image.error).length;

  return (
    <DialogShell onClose={onClose} label="Fechar midia">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1220] shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Biblioteca do conteudo</p>
            <h3 className="mt-1 text-2xl font-semibold text-white">Upload em massa e grade de imagens</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Selecione varias imagens, escolha a grade e confira uma previa parecida com a exibicao final no blog.
            </p>
          </div>
          <button type="button" onClick={onClose} className="self-start rounded-xl p-2 text-slate-300 hover:bg-white/10" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-white/10 bg-[#070d18] p-5 lg:border-b-0 lg:border-r lg:border-white/10">
            <button
              type="button"
              onClick={onPickFiles}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-300/10 px-4 py-5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {uploading ? "Enviando imagens..." : "Selecionar varias imagens"}
            </button>

            <div className="mt-6">
              <p className={labelClass}>Formato da grade</p>
              <div className="grid gap-2">
                {GALLERY_LAYOUTS.map((layout) => {
                  const active = galleryColumns === layout.columns;
                  return (
                    <button
                      key={layout.columns}
                      type="button"
                      onClick={() => onUpdateColumns(layout.columns)}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left transition",
                        active
                          ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <LayoutGrid className="h-4 w-4" />
                        {layout.label}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">{layout.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
              <p className="font-semibold text-slate-200">Resumo</p>
              <p className="mt-2">{readyCount} imagens prontas para inserir.</p>
              <p className="mt-1">A ordem dos cards define a ordem dentro da grade.</p>
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-5">
            {images.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
                <Images className="h-10 w-10 text-slate-600" />
                <h4 className="mt-4 text-lg font-semibold text-white">Nenhuma imagem selecionada</h4>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Clique em selecionar varias imagens para montar a previa da grade antes de inserir no texto.
                </p>
              </div>
            ) : (
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.18)] sm:p-6">
                <div className="mb-4 flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Previa no blog</p>
                    <h4 className="mt-1 text-xl font-semibold text-slate-950">Galeria em grade {galleryColumns}x{galleryColumns}</h4>
                  </div>
                  <p className="text-sm text-slate-500">Arraste uma imagem para mudar a ordem.</p>
                </div>
                <div
                  className="grid gap-4 max-sm:!grid-cols-1"
                  style={{ gridTemplateColumns: `repeat(${galleryColumns}, minmax(0, 1fr))` }}
                >
                  {images.map((image, index) => (
                    <figure
                      key={image.id}
                      draggable
                      onDragStart={() => setDraggingImageIndex(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggingImageIndex !== null) onReorderImage(draggingImageIndex, index);
                        setDraggingImageIndex(null);
                      }}
                      onDragEnd={() => setDraggingImageIndex(null)}
                      className={cn(
                        "group relative m-0 overflow-hidden rounded-[22px] border border-slate-200 bg-white p-2 shadow-sm transition",
                        draggingImageIndex === index && "scale-[0.99] border-cyan-300 opacity-70"
                      )}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-slate-200">
                      {image.uploading ? (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </div>
                      ) : image.error ? (
                        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-rose-200">{image.error}</div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image.src} alt="" className="h-full w-full object-cover" />
                      )}
                      <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        <span className="inline-flex items-center gap-1">
                          <GripVertical className="h-3.5 w-3.5" />
                          #{index + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveImage(image.id)}
                        className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white transition hover:bg-rose-500"
                        aria-label="Remover imagem"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      </div>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Depois de inserir, clique em uma imagem no editor para ajustar alt text, link e legenda.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">
              Cancelar
            </button>
            <button
              type="button"
              onClick={onInsert}
              disabled={readyCount === 0 || uploading}
              className="rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Inserir grade no texto
            </button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
function MetricPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span className="text-cyan-200">{icon}</span>
      <span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</span>
        <span className="block text-sm font-semibold text-slate-100">{value}</span>
      </span>
    </div>
  );
}

function SidebarTitle({ icon, eyebrow, title }: { icon: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-100">{icon}</span>
      <span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{eyebrow}</span>
        <span className="block text-lg font-semibold tracking-tight text-white">{title}</span>
      </span>
    </div>
  );
}

function DialogShell({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose} role="button" tabIndex={0} aria-label={label}>
      <div onClick={(e) => e.stopPropagation()} className="w-full">
        {children}
      </div>
    </div>
  );
}

function EditorToolbar({ editor, onLinkClick, onImageClick }: { editor: Editor | null; onLinkClick: () => void; onImageClick: () => void }) {
  if (!editor) return null;
  const buttonClass = (active = false) =>
    cn(
      "inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm transition",
      active ? "bg-cyan-200 text-slate-950 shadow-[0_10px_30px_rgba(103,232,249,0.16)]" : "text-slate-500 hover:bg-slate-200 hover:text-slate-950"
    );

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-3 py-2">
      <button type="button" title="Negrito" onClick={() => editor.chain().focus().toggleBold().run()} className={buttonClass(editor.isActive("bold"))}><Bold className="h-4 w-4" /></button>
      <button type="button" title="Italico" onClick={() => editor.chain().focus().toggleItalic().run()} className={buttonClass(editor.isActive("italic"))}><Italic className="h-4 w-4" /></button>
      <ToolbarDivider />
      <button type="button" title="Titulo H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={buttonClass(editor.isActive("heading", { level: 2 }))}><Heading2 className="h-4 w-4" /></button>
      <button type="button" title="Titulo H3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={buttonClass(editor.isActive("heading", { level: 3 }))}><Heading3 className="h-4 w-4" /></button>
      <button type="button" title="Titulo H4" onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} className={buttonClass(editor.isActive("heading", { level: 4 }))}><Heading4 className="h-4 w-4" /></button>
      <ToolbarDivider />
      <button type="button" title="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()} className={buttonClass(editor.isActive("bulletList"))}><List className="h-4 w-4" /></button>
      <button type="button" title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={buttonClass(editor.isActive("orderedList"))}><ListOrdered className="h-4 w-4" /></button>
      <button type="button" title="Citacao" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={buttonClass(editor.isActive("blockquote"))}><Quote className="h-4 w-4" /></button>
      <button type="button" title="Linha divisoria" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={buttonClass()}><Minus className="h-4 w-4" /></button>
      <ToolbarDivider />
      <button type="button" title="Link" onClick={onLinkClick} className={buttonClass(editor.isActive("link"))}><Link2 className="h-4 w-4" /></button>
      <button type="button" title="Imagem" onClick={onImageClick} className={buttonClass()}><ImagePlus className="h-4 w-4" /></button>
      <button type="button" title="Tabela" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={buttonClass()}><Table className="h-4 w-4" /></button>
      <ToolbarDivider />
      <button type="button" title="Desfazer" onClick={() => editor.chain().focus().undo().run()} className={buttonClass()}><Undo2 className="h-4 w-4" /></button>
      <button type="button" title="Refazer" onClick={() => editor.chain().focus().redo().run()} className={buttonClass()}><Redo2 className="h-4 w-4" /></button>
    </div>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-6 w-px bg-slate-200" />;
}
