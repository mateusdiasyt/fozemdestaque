"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mergeAttributes, Node as TiptapNode, type JSONContent } from "@tiptap/core";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  CalendarClock,
  Clock3,
  Eye,
  FileText,
  Film,
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
import { prepareImageUpload } from "@/lib/client-media";
import { parseCategoryIds } from "@/lib/post-categories";
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
  featuredImageTitle?: string | null;
  categoryId?: string | null;
  categoryIds?: string[] | null;
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

type VideoOrientation = "horizontal" | "vertical";

const DEFAULT_SINGLE_IMAGE_WIDTH = 720;
const MIN_SINGLE_IMAGE_WIDTH = 220;
const MAX_SINGLE_IMAGE_WIDTH = 1100;

function clampSingleImageWidth(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_SINGLE_IMAGE_WIDTH;
  return Math.min(MAX_SINGLE_IMAGE_WIDTH, Math.max(MIN_SINGLE_IMAGE_WIDTH, Math.round(numeric)));
}

function parseSingleImageWidth(element: Element) {
  const figure = element.closest("figure[data-single-image]");
  const directValue = figure?.getAttribute("data-width") ?? element.getAttribute("data-width");
  if (directValue) return clampSingleImageWidth(directValue);

  const figureStyle = figure?.getAttribute("style") ?? "";
  const widthMatch = figureStyle.match(/width:\s*(?:min\(100%,\s*)?(\d+(?:\.\d+)?)px/i);
  if (widthMatch?.[1]) return clampSingleImageWidth(widthMatch[1]);

  return DEFAULT_SINGLE_IMAGE_WIDTH;
}

function inferVideoOrientation(width?: number, height?: number): VideoOrientation {
  if (!width || !height) return "horizontal";
  return height > width ? "vertical" : "horizontal";
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

const VideoBlock = TiptapNode.create({
  name: "videoBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (element) =>
          element.querySelector("video")?.getAttribute("src") ??
          element.getAttribute("data-video-src") ??
          "",
      },
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-video-title") ?? "",
      },
      orientation: {
        default: "horizontal",
        parseHTML: (element) =>
          element.getAttribute("data-video-orientation") === "vertical" ? "vertical" : "horizontal",
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-video-width");
          return raw ? Number(raw) : null;
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-video-height");
          return raw ? Number(raw) : null;
        },
      },
      poster: {
        default: "",
        parseHTML: (element) => element.querySelector("video")?.getAttribute("poster") ?? "",
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-editor-video]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const orientation = HTMLAttributes.orientation === "vertical" ? "vertical" : "horizontal";
    const title = typeof HTMLAttributes.title === "string" ? HTMLAttributes.title.trim() : "";
    const maxWidth = orientation === "vertical" ? 520 : 980;
    const videoNode = [
      "video",
      mergeAttributes(
        {
          src: String(HTMLAttributes.src || ""),
          controls: "true",
          playsinline: "true",
          preload: "metadata",
          class: "foz-editorial-video-element",
        },
        HTMLAttributes.poster ? { poster: String(HTMLAttributes.poster) } : {}
      ),
    ];

    return [
      "figure",
      {
        "data-editor-video": "true",
        "data-video-src": String(HTMLAttributes.src || ""),
        "data-video-title": title,
        "data-video-orientation": orientation,
        "data-video-width": HTMLAttributes.width ? String(HTMLAttributes.width) : "",
        "data-video-height": HTMLAttributes.height ? String(HTMLAttributes.height) : "",
        style: `margin:32px auto;width:min(100%,${maxWidth}px)`,
      },
      [
        "div",
        {
          class: "foz-editorial-video-shell",
          "data-video-orientation": orientation,
        },
        videoNode,
      ],
      title
        ? [
            "figcaption",
            {
              style: "margin-top:10px;color:#64748b;font-size:14px;line-height:1.5;text-align:center",
            },
            title,
          ]
        : ["figcaption", { style: "display:none" }, ""],
    ] as any;
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
      width: {
        default: DEFAULT_SINGLE_IMAGE_WIDTH,
        parseHTML: (element) => parseSingleImageWidth(element),
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { href, width, ...imageAttributes } = HTMLAttributes as Record<string, unknown>;
    const resolvedWidth = clampSingleImageWidth(width);
    const altText = typeof imageAttributes.alt === "string" ? imageAttributes.alt.trim() : "";
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

    return [
      "figure",
      {
        "data-single-image": "true",
        "data-width": String(resolvedWidth),
        style: `margin:32px auto;text-align:center;width:min(100%,${resolvedWidth}px)`,
      },
      mediaNode,
      [
        "figcaption",
        {
          style: "margin-top:10px;color:#64748b;font-size:14px;line-height:1.5",
        },
        altText,
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
  width?: number;
  height?: number;
  convertedToWebp?: boolean;
};

interface PendingVideo {
  src: string;
  title: string;
  orientation: VideoOrientation;
  width?: number;
  height?: number;
  fileName: string;
  uploading: boolean;
  error?: string;
}

type EditableContentImage = ImageGridItem & {
  width?: number;
  height?: number;
};

interface ContentLayer {
  id: string;
  index: number;
  pos: number;
  nodeSize: number;
  type: string;
  label: string;
  preview: string;
  thumbnail?: string | null;
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
  image: EditableContentImage;
  total: number;
}

interface GalleryInsertTarget {
  index: number;
  pos: number;
  label: string;
  hint: string;
}

interface EditorDropPreview {
  targetIndex: number;
  top: number;
  left: number;
  width: number;
  height: number;
  hint: string;
  placement: "before" | "after";
}

interface EditorLayerFrame {
  top: number;
  left: number;
  width: number;
  height: number;
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
  const contentVideoInputRef = useRef<HTMLInputElement>(null);
  const featuredImageInputRef = useRef<HTMLInputElement>(null);
  const editorSurfaceRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage ?? "");
  const [featuredImageAlt, setFeaturedImageAlt] = useState(post?.featuredImageAlt ?? "");
  const [featuredImageTitle, setFeaturedImageTitle] = useState(post?.featuredImageTitle ?? "");
  const [categoryId, setCategoryId] = useState(post?.categoryId ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(() =>
    post?.categoryIds?.length ? post.categoryIds : parseCategoryIds(null, post?.categoryId ?? null)
  );
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
  const [videoPopup, setVideoPopup] = useState(false);
  const [mediaImages, setMediaImages] = useState<PendingImage[]>([]);
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null);
  const [galleryColumns, setGalleryColumns] = useState<GalleryColumns>(3);
  const [uploadingContentImages, setUploadingContentImages] = useState(false);
  const [uploadingContentVideo, setUploadingContentVideo] = useState(false);
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis | null>(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [helpPopup, setHelpPopup] = useState(false);
  const [selectedGridImage, setSelectedGridImage] = useState<SelectedGridImage | null>(null);
  const [galleryInsertTargetIndex, setGalleryInsertTargetIndex] = useState(0);
  const [videoInsertTargetIndex, setVideoInsertTargetIndex] = useState(0);
  const [activeEditorLayerPos, setActiveEditorLayerPos] = useState<number | null>(null);
  const [activeEditorLayerFrame, setActiveEditorLayerFrame] = useState<EditorLayerFrame | null>(null);
  const [dragGalleryPreview, setDragGalleryPreview] = useState<EditorDropPreview | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setHelpPopup(false);
      setLinkPopup(false);
      setImagePopup(false);
      setVideoPopup(false);
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
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ImageWithLink.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "rounded-2xl border border-slate-200 shadow-sm" },
      }),
      LinkWithRel.configure({ openOnClick: false, HTMLAttributes: { rel: "follow" } }),
      TableKit,
      ImageGrid,
      VideoBlock,
    ],
    content: post?.content ?? "",
    editorProps: {
      attributes: {
        class:
          "editorial-compose max-w-none min-h-[720px] px-6 py-8 outline-none sm:px-10 sm:py-10",
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
  const galleryInsertTargets = editor ? getGalleryInsertTargets(editor) : [{ index: 0, pos: 0, label: "No inicio do conteudo", hint: "A galeria entra antes da primeira camada." }];
  const selectedGalleryInsertTarget =
    galleryInsertTargets.find((target) => target.index === galleryInsertTargetIndex) ?? galleryInsertTargets[0];

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
    if (!editor) {
      setActiveEditorLayerPos(null);
      return;
    }

    const refresh = () => {
      const selectionFrom = editor.state.selection.from;
      const activeLayer = getEditorLayers(editor).find(
        (layer) => selectionFrom >= layer.pos && selectionFrom <= layer.pos + layer.nodeSize
      );
      setActiveEditorLayerPos(activeLayer?.pos ?? null);
    };

    refresh();
    editor.on("transaction", refresh);
    editor.on("selectionUpdate", refresh);

    return () => {
      editor.off("transaction", refresh);
      editor.off("selectionUpdate", refresh);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;
    editorDom.querySelectorAll(".foz-editor-selected-layer").forEach((element) => {
      element.classList.remove("foz-editor-selected-layer");
    });

    if (activeEditorLayerPos === null) return;
    getEditorLayerElement(editor, activeEditorLayerPos)?.classList.add("foz-editor-selected-layer");
  }, [editor, activeEditorLayerPos]);

  useEffect(() => {
    if (!editor || activeEditorLayerPos === null) {
      setActiveEditorLayerFrame(null);
      return;
    }

    const currentLayerPos = activeEditorLayerPos;
    const container = editorSurfaceRef.current;
    if (!container) {
      setActiveEditorLayerFrame(null);
      return;
    }

    function updateActiveLayerFrame() {
      const layerElement = getEditorLayerElement(editor, currentLayerPos);
      const surface = editorSurfaceRef.current;
      if (!layerElement || !surface) {
        setActiveEditorLayerFrame(null);
        return;
      }

      const layerRect = layerElement.getBoundingClientRect();
      const surfaceRect = surface.getBoundingClientRect();
      const paddingX = 18;
      const paddingY = 12;

      setActiveEditorLayerFrame({
        top: Math.max(0, layerRect.top - surfaceRect.top - paddingY),
        left: Math.max(12, layerRect.left - surfaceRect.left - paddingX),
        width: Math.min(surfaceRect.width - 24, layerRect.width + paddingX * 2),
        height: layerRect.height + paddingY * 2,
      });
    }

    updateActiveLayerFrame();
    const raf = window.requestAnimationFrame(updateActiveLayerFrame);
    window.addEventListener("resize", updateActiveLayerFrame);
    window.addEventListener("scroll", updateActiveLayerFrame, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateActiveLayerFrame);
      window.removeEventListener("scroll", updateActiveLayerFrame, true);
    };
  }, [editor, activeEditorLayerPos]);

  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;

    function handleEditorLayerClick(event: MouseEvent) {
      const target = event.target instanceof Node ? event.target : null;
      if (!target) return;

      const clickedLayer = getEditorLayerFromTarget(editor, target);
      if (!clickedLayer) return;

      setActiveEditorLayerPos(clickedLayer.pos);
    }

    function getImageFiles(fileList: FileList | null | undefined) {
      return Array.from(fileList ?? []).filter((file) => file.type.startsWith("image/"));
    }

    function getVideoFiles(fileList: FileList | null | undefined) {
      return Array.from(fileList ?? []).filter((file) => file.type.startsWith("video/"));
    }

    function handleEditorDrop(event: DragEvent) {
      const imageFiles = getImageFiles(event.dataTransfer?.files);
      const videoFiles = getVideoFiles(event.dataTransfer?.files);
      if (imageFiles.length === 0 && videoFiles.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (imageFiles.length > 0) {
        void queueContentImages(imageFiles, dragGalleryPreview?.targetIndex);
        return;
      }
      if (videoFiles[0]) {
        void handleQueuedVideoFile(videoFiles[0], dragGalleryPreview?.targetIndex);
      }
    }

    function handleEditorPaste(event: ClipboardEvent) {
      const imageFiles = getImageFiles(event.clipboardData?.files);
      const videoFiles = getVideoFiles(event.clipboardData?.files);
      if (imageFiles.length === 0 && videoFiles.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (imageFiles.length > 0) {
        void queueContentImages(imageFiles);
        return;
      }
      if (videoFiles[0]) {
        void handleQueuedVideoFile(videoFiles[0]);
      }
    }

    editorDom.addEventListener("click", handleEditorLayerClick, true);
    editorDom.addEventListener("drop", handleEditorDrop);
    editorDom.addEventListener("paste", handleEditorPaste);

    return () => {
      editorDom.removeEventListener("click", handleEditorLayerClick, true);
      editorDom.removeEventListener("drop", handleEditorDrop);
      editorDom.removeEventListener("paste", handleEditorPaste);
    };
  }, [dragGalleryPreview?.targetIndex, editor]);

  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;
    let dragDepth = 0;

    function hasMediaItems(dataTransfer: DataTransfer | null | undefined) {
      return Array.from(dataTransfer?.items ?? []).some(
        (item) =>
          item.kind === "file" &&
          (item.type.startsWith("image/") || item.type.startsWith("video/"))
      );
    }

    function updateDropPreview(clientY: number) {
      const container = editorSurfaceRef.current;
      if (!container) return;
      const preview = getGalleryDropPreview(editor, container, clientY);
      setDragGalleryPreview(preview);
      setGalleryInsertTargetIndex(preview.targetIndex);
    }

    function resetDropPreview() {
      dragDepth = 0;
      setDragGalleryPreview(null);
    }

    function handleDragEnter(event: DragEvent) {
      if (!hasMediaItems(event.dataTransfer)) return;
      dragDepth += 1;
      event.preventDefault();
      event.stopPropagation();
      updateDropPreview(event.clientY);
    }

    function handleDragOver(event: DragEvent) {
      if (!hasMediaItems(event.dataTransfer)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      updateDropPreview(event.clientY);
    }

    function handleDragLeave(event: DragEvent) {
      if (!hasMediaItems(event.dataTransfer)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      const rect = editorDom.getBoundingClientRect();
      const leftEditorBounds =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (dragDepth === 0 || leftEditorBounds) {
        setDragGalleryPreview(null);
      }
    }

    editorDom.addEventListener("dragenter", handleDragEnter);
    editorDom.addEventListener("dragover", handleDragOver);
    editorDom.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragend", resetDropPreview);

    return () => {
      editorDom.removeEventListener("dragenter", handleDragEnter);
      editorDom.removeEventListener("dragover", handleDragOver);
      editorDom.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragend", resetDropPreview);
    };
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

  function toggleCategorySelection(nextCategoryId: string) {
    setCategoryIds((current) => {
      if (current.includes(nextCategoryId)) {
        const next = current.filter((id) => id !== nextCategoryId);
        setCategoryId(next[0] ?? "");
        return next;
      }

      const next = [...current, nextCategoryId];
      if (!categoryId) setCategoryId(nextCategoryId);
      return next;
    });
  }

  function setPrimaryCategory(nextCategoryId: string) {
    setCategoryIds((current) => {
      if (!current.includes(nextCategoryId)) {
        const next = [nextCategoryId, ...current];
        setCategoryId(nextCategoryId);
        return next;
      }

      const next = [nextCategoryId, ...current.filter((id) => id !== nextCategoryId)];
      setCategoryId(nextCategoryId);
      return next;
    });
  }

  function openLinkPopup() {
    const { href, rel } = editor?.getAttributes("link") ?? {};
    setLinkUrl(href ?? "");
    setLinkRel((rel === "nofollow" ? "nofollow" : rel === "sponsored" ? "sponsored" : "follow") as "follow" | "nofollow" | "sponsored");
    setLinkPopup(true);
  }

  function openImageLibrary() {
    if (editor) {
      setGalleryInsertTargetIndex(getDefaultGalleryInsertTarget(editor).index);
    }
    setImagePopup(true);
  }

  function openVideoLibrary() {
    if (editor) {
      setVideoInsertTargetIndex(getDefaultGalleryInsertTarget(editor).index);
    }
    contentVideoInputRef.current?.click();
  }

  function applyLink() {
    if (linkUrl) {
      const relVal = linkRel === "follow" ? null : linkRel;
      editor?.chain().focus().extendMarkRange("link").setLink({ href: linkUrl, rel: relVal }).run();
    }
    setLinkPopup(false);
    setLinkUrl("");
  }

  async function uploadMedia(file: File, kind: "image" | "video" = "image") {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Erro ao enviar imagem");
    return data.url as string;
  }

  async function queueContentImages(files: File[], preferredTargetIndex?: number) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const pendingImages: PendingImage[] = imageFiles.map((file) => ({
      id: crypto.randomUUID(),
      src: "",
      fileName: file.name,
      alt: "",
      title: "",
      href: "",
      uploading: true,
    }));

    if (typeof preferredTargetIndex === "number") {
      setGalleryInsertTargetIndex(preferredTargetIndex);
    } else if (!imagePopup && editor) {
      setGalleryInsertTargetIndex(getDefaultGalleryInsertTarget(editor).index);
    }
    setImagePopup(true);
    setMediaImages((current) => [...current, ...pendingImages]);
    setUploadingContentImages(true);
    setUploadError("");

    await Promise.all(
      imageFiles.map(async (file, index) => {
        const imageId = pendingImages[index].id;
        try {
          const prepared = await prepareImageUpload(file);
          const url = await uploadMedia(prepared.file);
          setMediaImages((current) =>
            current.map((image) =>
              image.id === imageId
                ? {
                    ...image,
                    src: url,
                    alt: prepared.alt,
                    title: prepared.title,
                    width: prepared.width,
                    height: prepared.height,
                    convertedToWebp: prepared.convertedToWebp,
                    uploading: false,
                  }
                : image
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

  async function handleContentImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (files.length === 0) return;
    await queueContentImages(files);
  }

  async function readVideoMetadata(file: File) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const metadata = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.playsInline = true;
        video.onloadedmetadata = () => {
          resolve({ width: video.videoWidth, height: video.videoHeight });
        };
        video.onerror = () => reject(new Error("Nao foi possivel ler o video."));
        video.src = objectUrl;
      });

      return metadata;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function handleQueuedVideoFile(file: File, preferredTargetIndex?: number) {
    if (!file) return;

    if (typeof preferredTargetIndex === "number") {
      setVideoInsertTargetIndex(preferredTargetIndex);
    } else if (editor) {
      setVideoInsertTargetIndex(getDefaultGalleryInsertTarget(editor).index);
    }

    setUploadingContentVideo(true);
    setVideoPopup(true);
    setUploadError("");
    setPendingVideo({
      src: "",
      title: file.name.replace(/\.[^.]+$/, ""),
      orientation: "horizontal",
      fileName: file.name,
      uploading: true,
    });

    try {
      const metadata = await readVideoMetadata(file);
      const url = await uploadMedia(file, "video");
      setPendingVideo({
        src: url,
        title: file.name.replace(/\.[^.]+$/, ""),
        orientation: inferVideoOrientation(metadata.width, metadata.height),
        width: metadata.width,
        height: metadata.height,
        fileName: file.name,
        uploading: false,
      });
    } catch (err) {
      setPendingVideo({
        src: "",
        title: file.name.replace(/\.[^.]+$/, ""),
        orientation: "horizontal",
        fileName: file.name,
        uploading: false,
        error: err instanceof Error ? err.message : "Nao foi possivel enviar o video",
      });
      setUploadError(err instanceof Error ? err.message : "Nao foi possivel enviar o video");
    } finally {
      setUploadingContentVideo(false);
    }
  }

  async function handleContentVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    await handleQueuedVideoFile(file);
  }

  async function handleFeaturedImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setUploadingFeaturedImage(true);
    setUploadError("");
    try {
      const prepared = await prepareImageUpload(file);
      const url = await uploadMedia(prepared.file);
      setFeaturedImage(url);
      if (!featuredImageAlt.trim()) setFeaturedImageAlt(prepared.alt);
      if (!featuredImageTitle.trim()) setFeaturedImageTitle(prepared.title);
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
        title: image.title?.trim() || "",
        href: image.href?.trim() || "",
        width: image.width,
        height: image.height,
      }));

    if (readyImages.length === 0 || !editor) return;
    const insertTarget = selectedGalleryInsertTarget ?? getDefaultGalleryInsertTarget(editor);
    editor
      .chain()
      .focus()
      .insertContentAt(insertTarget.pos, {
        type: "imageGrid",
        attrs: {
          id: crypto.randomUUID(),
          columns: galleryColumns,
          images: readyImages,
        },
      })
      .setNodeSelection(insertTarget.pos)
      .run();
    setImagePopup(false);
    setMediaImages([]);
    setGalleryInsertTargetIndex(0);
  }

  function insertVideoIntoContent() {
    if (!editor || !pendingVideo?.src || pendingVideo.uploading || pendingVideo.error) return;
    const insertTarget =
      galleryInsertTargets.find((target) => target.index === videoInsertTargetIndex) ??
      getDefaultGalleryInsertTarget(editor);

    editor
      .chain()
      .focus()
      .insertContentAt(insertTarget.pos, {
        type: "videoBlock",
        attrs: {
          src: pendingVideo.src,
          title: pendingVideo.title.trim(),
          orientation: pendingVideo.orientation,
          width: pendingVideo.width,
          height: pendingVideo.height,
        },
      })
      .setNodeSelection(insertTarget.pos)
      .run();

    setPendingVideo(null);
    setVideoPopup(false);
    setVideoInsertTargetIndex(0);
  }

  function updateSelectedGridImage(patch: Partial<EditableContentImage>) {
    if (!editor || !selectedGridImage) return;
    if (selectedGridImage.type === "single") {
      const imagePos = selectedGridImage.imagePos;
      if (typeof imagePos !== "number") return;
      const node = editor.state.doc.nodeAt(imagePos);
      if (!node || node.type.name !== "image") return;
      const nextWidth = clampSingleImageWidth(patch.width ?? node.attrs.width);

      const nextImage = {
        src: String(node.attrs.src || ""),
        alt: String(patch.alt ?? node.attrs.alt ?? ""),
        title: String(patch.title ?? node.attrs.title ?? ""),
        href: String(patch.href ?? node.attrs.href ?? ""),
        width: nextWidth,
        height: Number(node.attrs.height || patch.height || 0) || undefined,
      };

      editor
        .chain()
        .focus()
        .command(({ tr, dispatch }) => {
        dispatch?.(tr.setNodeMarkup(imagePos, undefined, { ...node.attrs, ...patch, width: nextWidth }));
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
      index === selectedGridImage.imageIndex
        ? {
            ...image,
            alt: patch.alt ?? image.alt,
            title: patch.title ?? image.title,
            href: patch.href ?? image.href,
          }
        : image
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
        featuredImageTitle: featuredImageTitle?.trim() || undefined,
        categoryId: categoryIds[0] || categoryId || undefined,
        categoryIds,
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
      <input ref={contentVideoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleContentVideoUpload} />
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
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} onBlur={() => setSlug((current) => (current ? slugify(current) : ""))} className={fieldClass} placeholder="url-amigavel" />
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
                <p className="text-sm text-slate-400">Use titulos, links, tabelas, alinhamento, citacoes e imagens no meio da materia.</p>
              </div>
            </div>
            <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
              <ContentLayers editor={editor} activeLayerPos={activeEditorLayerPos} onActivateLayer={setActiveEditorLayerPos} />
              <div ref={editorSurfaceRef} className="relative overflow-hidden rounded-[30px] border border-[#e7dccd] bg-[linear-gradient(180deg,#fffdf8_0%,#f8f3ea_100%)] shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
                <div className="sticky top-3 z-20 border-b border-[#e7dccd] bg-[rgba(255,253,248,0.94)] px-3 py-3 backdrop-blur">
                  <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a7f73]">Ferramentas flutuantes</p>
                      <p className="mt-1 text-sm text-[#5f707d]">Formato e mídia acompanham seu scroll para manter o fluxo de edição.</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button type="button" onClick={openVideoLibrary} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d9c5a4] bg-[#f5ead7] px-4 py-3 text-sm font-semibold text-[#102033] transition hover:bg-[#efe1ca]">
                        <Film className="h-4 w-4" />
                        Inserir video
                      </button>
                      <button type="button" onClick={openImageLibrary} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-[#102033] transition hover:bg-cyan-300/20">
                      <ImagePlus className="h-4 w-4" />
                      Inserir imagem
                      </button>
                    </div>
                  </div>
                  <EditorToolbar editor={editor} onLinkClick={openLinkPopup} onImageClick={openImageLibrary} onVideoClick={openVideoLibrary} />
                </div>
                <EditorContent editor={editor} />
                {activeEditorLayerFrame && (
                  <div
                    className="pointer-events-none absolute z-[6] rounded-[28px] border border-cyan-400/75 bg-cyan-300/8 shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_22px_50px_rgba(103,232,249,0.14)] transition-all duration-200 ease-out"
                    style={{
                      left: activeEditorLayerFrame.left,
                      top: activeEditorLayerFrame.top,
                      width: activeEditorLayerFrame.width,
                      height: activeEditorLayerFrame.height,
                    }}
                  >
                    <div className="absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(103,232,249,0.06)_0%,rgba(255,255,255,0.02)_100%)]" />
                  </div>
                )}
                {dragGalleryPreview && (
                  <div
                    className="pointer-events-none absolute z-10 overflow-hidden rounded-[24px] border border-dashed border-cyan-400/70 bg-cyan-200/12 shadow-[0_18px_45px_rgba(103,232,249,0.18)] backdrop-blur-sm transition-all duration-200 ease-out"
                    style={{
                      left: dragGalleryPreview.left,
                      top: dragGalleryPreview.top,
                      width: dragGalleryPreview.width,
                      height: dragGalleryPreview.height,
                    }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(103,232,249,0.18)_0%,rgba(255,255,255,0.05)_100%)]" />
                    <div className="relative flex h-full items-center gap-3 px-5">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#102033] text-cyan-100 shadow-[0_12px_24px_rgba(16,32,51,0.18)]">
                        <Images className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#102033]">Nova galeria entra aqui</p>
                        <p className="mt-1 text-xs leading-5 text-[#405264]">{dragGalleryPreview.hint}</p>
                      </div>
                    </div>
                  </div>
                )}
                {editor && selectedGridImage?.type === "single" && (
                  <ImageResizeOverlay
                    editor={editor}
                    selection={selectedGridImage}
                    containerRef={editorSurfaceRef}
                    onResize={updateSelectedGridImage}
                  />
                )}
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
                <label className={labelClass}>Editorias</label>
                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs leading-5 text-slate-400">
                    Selecione varias editorias para publicar a mesma materia em mais de um fluxo. A primeira vira a principal.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const selected = categoryIds.includes(category.id);
                      const primary = categoryId === category.id || categoryIds[0] === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => toggleCategorySelection(category.id)}
                          className={cn(
                            "rounded-full border px-3 py-2 text-xs font-semibold transition",
                            selected
                              ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                              : "border-white/10 bg-[#070d18] text-slate-300 hover:bg-white/10"
                          )}
                        >
                          {category.name}
                          {primary ? " · principal" : ""}
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Categoria principal
                    </label>
                    <select
                      value={categoryIds[0] ?? ""}
                      onChange={(e) => setPrimaryCategory(e.target.value)}
                      className={fieldClass}
                      disabled={categoryIds.length === 0}
                    >
                      <option value="">Selecione a principal</option>
                      {categoryIds.map((selectedId) => {
                        const selectedCategory = categories.find((category) => category.id === selectedId);
                        return selectedCategory ? (
                          <option key={selectedCategory.id} value={selectedCategory.id}>
                            {selectedCategory.name}
                          </option>
                        ) : null;
                      })}
                    </select>
                  </div>
                </div>
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
                  <img src={featuredImage} alt="" className="h-44 w-full object-contain bg-[#f8fafc]" onError={(e) => (e.currentTarget.style.display = "none")} />
                </div>
              )}
              <div>
                <label className={labelClass}>Titulo da imagem</label>
                <input type="text" value={featuredImageTitle} onChange={(e) => setFeaturedImageTitle(e.target.value)} placeholder="Titulo interno da midia" className={fieldClass} />
              </div>
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
            insertTargets={galleryInsertTargets}
            selectedInsertTargetIndex={selectedGalleryInsertTarget?.index ?? galleryInsertTargetIndex}
            images={mediaImages}
            onClose={() => {
              setImagePopup(false);
              setGalleryInsertTargetIndex(0);
            }}
            onInsert={insertImageIntoContent}
            onPickFiles={() => contentImageInputRef.current?.click()}
            onRemoveImage={(id) => setMediaImages((current) => current.filter((image) => image.id !== id))}
            onReorderImage={(fromIndex, toIndex) =>
              setMediaImages((current) => reorderList(current, fromIndex, toIndex))
            }
            onUpdateInsertTarget={setGalleryInsertTargetIndex}
            onUpdateColumns={setGalleryColumns}
          uploading={uploadingContentImages}
        />
      )}

      {videoPopup && (
        <VideoDialog
          pendingVideo={pendingVideo}
          insertTargets={galleryInsertTargets}
          selectedInsertTargetIndex={videoInsertTargetIndex}
          onClose={() => {
            setVideoPopup(false);
            setPendingVideo(null);
          }}
          onInsert={insertVideoIntoContent}
          onPickVideo={() => contentVideoInputRef.current?.click()}
          onUpdateInsertTarget={setVideoInsertTargetIndex}
          onUpdateVideo={(patch) =>
            setPendingVideo((current) => (current ? { ...current, ...patch } : current))
          }
          uploading={uploadingContentVideo}
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
  onUpdate: (patch: Partial<EditableContentImage>) => void;
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
        <img src={image.src} alt="" className="h-36 w-full object-contain bg-white" />
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Titulo da imagem</label>
          <input
            value={image.title || ""}
            onChange={(event) => onUpdate({ title: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            placeholder="Titulo interno para SEO e organizacao"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Texto alternativo</label>
          <input
            value={image.alt || ""}
            onChange={(event) => onUpdate({ alt: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            placeholder="Esse texto aparece abaixo da imagem"
          />
          <p className="mt-1.5 text-xs leading-5 text-slate-500">
            Esse texto tambem sera usado como descricao para SEO e acessibilidade.
          </p>
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
      </div>
    </div>
  );
}

function ImageResizeOverlay({
  editor,
  selection,
  containerRef,
  onResize,
}: {
  editor: Editor;
  selection: SelectedGridImage;
  containerRef: { current: HTMLDivElement | null };
  onResize: (patch: Partial<EditableContentImage>) => void;
}) {
  const [frame, setFrame] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [activeHandle, setActiveHandle] = useState<"left" | "right" | null>(null);
  const dragStateRef = useRef<{
    handle: "left" | "right";
    pointerId: number;
    startX: number;
    startWidth: number;
    width: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  const measureFrame = useCallback(() => {
    const container = containerRef.current;
    const imageElement = findSingleImageElement(editor, selection);
    if (!container || !imageElement) {
      setFrame(null);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const imageRect = imageElement.getBoundingClientRect();
    setFrame({
      left: imageRect.left - containerRect.left,
      top: imageRect.top - containerRect.top,
      width: imageRect.width,
      height: imageRect.height,
    });
  }, [containerRef, editor, selection]);

  const queueMeasure = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      measureFrame();
    });
  }, [measureFrame]);

  const applyPreviewWidth = useCallback(
    (nextWidth: number) => {
      const imageElement = findSingleImageElement(editor, selection);
      const figureElement = imageElement?.closest<HTMLElement>("figure[data-single-image]");
      if (!figureElement) return;

      const clampedWidth = clampSingleImageWidth(nextWidth);
      figureElement.dataset.width = String(clampedWidth);
      figureElement.style.width = `${clampedWidth}px`;
      figureElement.style.maxWidth = "100%";
      queueMeasure();
    },
    [editor, queueMeasure, selection]
  );

  useEffect(() => {
    measureFrame();
    const imageElement = findSingleImageElement(editor, selection);
    if (!imageElement || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => measureFrame());
    observer.observe(imageElement);
    window.addEventListener("resize", measureFrame);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureFrame);
    };
  }, [editor, measureFrame, selection]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeHandle) return;

    function handlePointerMove(event: PointerEvent) {
      const dragState = dragStateRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      event.preventDefault();

      const delta = event.clientX - dragState.startX;
      const nextWidth = clampSingleImageWidth(
        dragState.handle === "right" ? dragState.startWidth + delta : dragState.startWidth - delta
      );
      dragState.width = nextWidth;
      applyPreviewWidth(nextWidth);
    }

    function finishResize(event: PointerEvent) {
      const dragState = dragStateRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      event.preventDefault();
      onResize({ width: dragState.width });
      dragStateRef.current = null;
      setActiveHandle(null);
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishResize);
    window.addEventListener("pointercancel", finishResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
    };
  }, [activeHandle, applyPreviewWidth, onResize]);

  if (!frame) return null;

  const displayWidth = Math.round(dragStateRef.current?.width ?? selection.image.width ?? frame.width);

  function beginResize(handle: "left" | "right", event: React.PointerEvent<HTMLButtonElement>) {
    if (!frame) return;
    event.preventDefault();
    event.stopPropagation();
    const currentWidth = clampSingleImageWidth(selection.image.width ?? frame.width);
    dragStateRef.current = {
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: currentWidth,
      width: currentWidth,
    };
    setActiveHandle(handle);
  }

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: frame.left,
        top: frame.top,
        width: frame.width,
        height: frame.height,
      }}
    >
      <div className="foz-editor-resize-frame absolute inset-0 rounded-[32px]" />
      <div className="editorial-image-resize-pill absolute left-1/2 top-3 -translate-x-1/2">
        {displayWidth}px
      </div>
      <button
        type="button"
        className="editorial-image-resize-handle pointer-events-auto"
        data-side="left"
        aria-label="Diminuir ou aumentar imagem pela esquerda"
        onPointerDown={(event) => beginResize("left", event)}
        onClick={(event) => event.stopPropagation()}
      />
      <button
        type="button"
        className="editorial-image-resize-handle pointer-events-auto"
        data-side="right"
        aria-label="Diminuir ou aumentar imagem pela direita"
        onPointerDown={(event) => beginResize("right", event)}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}

function ContentLayers({
  editor,
  activeLayerPos,
  onActivateLayer,
}: {
  editor: Editor | null;
  activeLayerPos: number | null;
  onActivateLayer: (pos: number | null) => void;
}) {
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
      const active =
        nextLayers.find((layer) => layer.pos === activeLayerPos) ??
        nextLayers.find((layer) => {
          const selectionFrom = editor.state.selection.from;
          return selectionFrom >= layer.pos && selectionFrom <= layer.pos + layer.nodeSize;
        });
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
  }, [editor, activeLayerPos]);

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
    onActivateLayer(layer.pos);
    if (["image", "imageGrid", "videoBlock", "horizontalRule", "table"].includes(layer.type)) {
      editor.chain().focus().setNodeSelection(layer.pos).run();
      return;
    }
    editor
      .chain()
      .focus()
      .setTextSelection({
        from: layer.pos + 1,
        to: Math.max(layer.pos + 1, layer.pos + layer.nodeSize - 1),
      })
      .run();
  }

  function moveLayer(fromIndex: number, toIndex: number) {
    if (!editor || fromIndex === toIndex) return;
    moveEditorLayer(editor, fromIndex, toIndex);
  }

  function deleteLayer(targetIndex: number) {
    if (!editor) return;
    removeEditorLayer(editor, targetIndex);
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
    const visibleIndex = visibleLayers.findIndex((item) => item.id === layer.id);
    if (visibleIndex < 0) return;

    const rect = card.getBoundingClientRect();
    event.preventDefault();
    event.stopPropagation();
    selectLayer(layer);
    setLayerDrag({
      originalIndex: visibleIndex,
      targetIndex: visibleIndex,
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
          visibleLayers.map((layer, index) => {
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
                      <div className="flex items-start gap-3">
                        {layer.thumbnail ? (
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={layer.thumbnail} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">{layer.label}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{layer.preview}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveLayer(index, Math.max(0, index - 1))}
                    disabled={index === 0}
                    className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/10 disabled:opacity-30"
                    aria-label="Mover camada para cima"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLayer(index, Math.min(visibleLayers.length - 1, index + 1))}
                    disabled={index === visibleLayers.length - 1}
                    className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/10 disabled:opacity-30"
                    aria-label="Mover camada para baixo"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteLayer(index)}
                    className="rounded-lg border border-rose-300/20 p-1.5 text-rose-200 hover:bg-rose-500/10"
                    aria-label="Remover camada"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
                      Clique na imagem dentro do editor para ajustar texto alternativo e link.
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
      image: {
        ...image,
        width: typeof image.width === "number" ? image.width : undefined,
        height: typeof image.height === "number" ? image.height : undefined,
      },
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
      title: String(nodeMatch.node.attrs.title || ""),
      href: String(nodeMatch.node.attrs.href || ""),
      width: clampSingleImageWidth(nodeMatch.node.attrs.width),
      height: Number(nodeMatch.node.attrs.height || 0) || undefined,
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
    const textContent = node.textContent ?? "";
    layers.push({
      id: `${index}-${node.type.name}-${pos}-${node.nodeSize}`,
      index,
      pos,
      nodeSize: node.nodeSize,
      type: node.type.name,
      label: getLayerLabel(node.type.name, node.attrs, textContent),
      preview: getLayerPreview(node.type.name, textContent, node.attrs),
      thumbnail: getLayerThumbnail(node.type.name, node.attrs),
    });
  });

  return layers;
}

function isSpacerParagraph(type: string, text: string) {
  return type === "paragraph" && !text.replace(/\u00a0/g, " ").trim();
}

function getLayerLabel(type: string, attrs: Record<string, unknown>, text: string) {
  if (type === "heading") return `Titulo H${attrs.level || 2}`;
  if (isSpacerParagraph(type, text)) return "Espaco";
  if (type === "paragraph") return "Texto";
  if (type === "imageGrid") return "Galeria";
  if (type === "image") return "Imagem";
  if (type === "videoBlock") return "Video";
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
  if (isSpacerParagraph(type, text)) return "Paragrafo em branco para respiro visual";
  if (type === "videoBlock") {
    const orientation = attrs.orientation === "vertical" ? "vertical" : "horizontal";
    return String(attrs.title || `Video ${orientation} no conteudo`);
  }
  if (type === "image") return String(attrs.alt || attrs.title || attrs.src || "Imagem sem descricao");
  return text?.trim() || "Camada vazia";
}

function getLayerThumbnail(type: string, attrs: Record<string, unknown>) {
  if (type === "image") return typeof attrs.src === "string" ? attrs.src : null;
  if (type === "imageGrid") {
    const [firstImage] = safeImageGridItems(attrs.images);
    return firstImage?.src ?? null;
  }
  return null;
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
      title: image.title ? String(image.title) : "",
      href: image.href ? String(image.href) : "",
      width: typeof image.width === "number" ? image.width : undefined,
      height: typeof image.height === "number" ? image.height : undefined,
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

function removeEditorLayer(editor: Editor, index: number) {
  const json = editor.getJSON() as JSONContent;
  const content = Array.isArray(json.content) ? [...json.content] : [];
  if (!content[index]) return;

  content.splice(index, 1);
  editor.commands.setContent({ ...json, content });
}

function getLayerDropIndex(
  layers: ContentLayer[],
  refs: Map<string, HTMLDivElement>,
  originalIndex: number,
  clientY: number
) {
  const layerRects = layers
    .map((layer, index) => ({ layer, index }))
    .filter(({ index }) => index !== originalIndex)
    .map(({ layer, index }) => {
      const rect = refs.get(layer.id)?.getBoundingClientRect();
      return rect ? { rect, index } : null;
    })
    .filter((item): item is { rect: DOMRect; index: number } => Boolean(item))
    .sort((a, b) => a.rect.top - b.rect.top);

  const targetIndex = layerRects.find(({ rect }) => clientY < rect.top + rect.height / 2);
  return targetIndex ? targetIndex.index : layerRects.length;
}

function reorderList<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || !items[fromIndex] || toIndex < 0 || toIndex >= items.length) return items;
  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

function truncateLayerPreview(value: string, maxLength = 72) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function getGalleryInsertTargets(editor: Editor): GalleryInsertTarget[] {
  const layers = getEditorLayers(editor);
  const targets: GalleryInsertTarget[] = [
    {
      index: 0,
      pos: 0,
      label: "No inicio do conteudo",
      hint: layers[0]
        ? `A galeria entra antes de ${layers[0].label.toLowerCase()}.`
        : "A galeria sera o primeiro bloco da materia.",
    },
  ];

  layers.forEach((layer) => {
    targets.push({
      index: layer.index + 1,
      pos: layer.pos + layer.nodeSize,
      label: `Apos ${layer.label.toLowerCase()}`,
      hint: truncateLayerPreview(layer.preview) || "A galeria entra logo abaixo desta camada.",
    });
  });

  return targets;
}

function getDefaultGalleryInsertTarget(editor: Editor): GalleryInsertTarget {
  const targets = getGalleryInsertTargets(editor);
  const selectionFrom = editor.state.selection.from;
  const layers = getEditorLayers(editor);
  const activeLayer = layers.find(
    (layer) => selectionFrom >= layer.pos && selectionFrom <= layer.pos + layer.nodeSize
  );

  if (activeLayer) {
    return (
      targets.find((target) => target.index === activeLayer.index + 1) ??
      targets[targets.length - 1]
    );
  }

  return targets[targets.length - 1] ?? targets[0];
}

function resolveTopLevelEditorElement(editor: Editor, node: Node | null | undefined) {
  const editorRoot = editor.view.dom;
  if (!(editorRoot instanceof HTMLElement) || !node) return null;

  let currentElement = node instanceof HTMLElement ? node : node.parentElement;
  while (currentElement && currentElement.parentElement !== editorRoot) {
    currentElement = currentElement.parentElement;
  }

  return currentElement?.parentElement === editorRoot ? currentElement : null;
}

function getEditorLayerElement(editor: Editor, pos: number) {
  const editorRoot = editor.view.dom;
  if (!(editorRoot instanceof HTMLElement)) return null;

  const layer = getEditorLayers(editor).find((item) => item.pos === pos);
  if (layer) {
    const indexedChild = editorRoot.children.item(layer.index);
    if (indexedChild instanceof HTMLElement) return indexedChild;
  }

  const directNode = editor.view.nodeDOM(pos);
  const directElement = resolveTopLevelEditorElement(editor, directNode);
  if (directElement) return directElement;

  const nearSelection = [pos + 1, Math.max(0, pos - 1)];
  for (const targetPos of nearSelection) {
    try {
      const domAt = editor.view.domAtPos(targetPos);
      const resolved = resolveTopLevelEditorElement(editor, domAt.node);
      if (resolved) return resolved;
    } catch {
      continue;
    }
  }

  return null;
}

function getEditorLayerFromTarget(editor: Editor, target: Node) {
  const editorRoot = editor.view.dom;
  if (!(editorRoot instanceof HTMLElement)) return null;

  const topLevelElement = resolveTopLevelEditorElement(editor, target);
  if (!topLevelElement) return null;

  const childIndex = Array.from(editorRoot.children).indexOf(topLevelElement);
  if (childIndex < 0) return null;

  return getEditorLayers(editor).find((layer) => layer.index === childIndex) ?? null;
}

function getGalleryDropPreview(editor: Editor, container: HTMLDivElement, clientY: number): EditorDropPreview {
  const layers = getEditorLayers(editor);
  const containerRect = container.getBoundingClientRect();
  const previewHeight = 88;
  const horizontalInset = 24;

  if (layers.length === 0) {
    return {
      targetIndex: 0,
      top: 32,
      left: horizontalInset,
      width: Math.max(220, containerRect.width - horizontalInset * 2),
      height: previewHeight,
      hint: "A galeria sera o primeiro bloco da materia.",
      placement: "before",
    };
  }

  const layerEntries = layers
    .map((layer, index) => {
      const element = getEditorLayerElement(editor, layer.pos);
      const rect = element?.getBoundingClientRect();
      return element && rect ? { layer, index, rect } : null;
    })
    .filter((entry): entry is { layer: ContentLayer; index: number; rect: DOMRect } => Boolean(entry));

  if (layerEntries.length === 0) {
    return {
      targetIndex: 0,
      top: 32,
      left: horizontalInset,
      width: Math.max(220, containerRect.width - horizontalInset * 2),
      height: previewHeight,
      hint: "A galeria sera inserida no corpo do conteudo.",
      placement: "before",
    };
  }

  for (const entry of layerEntries) {
    if (clientY < entry.rect.top + entry.rect.height / 2) {
      return {
        targetIndex: entry.index,
        top: Math.max(24, entry.rect.top - containerRect.top - previewHeight + 12),
        left: Math.max(16, entry.rect.left - containerRect.left),
        width: Math.min(entry.rect.width, containerRect.width - 32),
        height: previewHeight,
        hint: `Entre as camadas, antes de ${entry.layer.label.toLowerCase()}.`,
        placement: "before",
      };
    }
  }

  const lastEntry = layerEntries[layerEntries.length - 1];
  return {
    targetIndex: layers.length,
    top: lastEntry.rect.bottom - containerRect.top + 12,
    left: Math.max(16, lastEntry.rect.left - containerRect.left),
    width: Math.min(lastEntry.rect.width, containerRect.width - 32),
    height: previewHeight,
    hint: `Entre as camadas, depois de ${lastEntry.layer.label.toLowerCase()}.`,
    placement: "after",
  };
}

function MediaDialog({
  galleryColumns,
  insertTargets,
  selectedInsertTargetIndex,
  images,
  onClose,
  onInsert,
  onPickFiles,
  onRemoveImage,
  onReorderImage,
  onUpdateInsertTarget,
  onUpdateColumns,
  uploading,
}: {
  galleryColumns: GalleryColumns;
  insertTargets: GalleryInsertTarget[];
  selectedInsertTargetIndex: number;
  images: PendingImage[];
  onClose: () => void;
  onInsert: () => void;
  onPickFiles: () => void;
  onRemoveImage: (id: string) => void;
  onReorderImage: (fromIndex: number, toIndex: number) => void;
  onUpdateInsertTarget: (targetIndex: number) => void;
  onUpdateColumns: (columns: GalleryColumns) => void;
  uploading: boolean;
}) {
  const [draggingImageIndex, setDraggingImageIndex] = useState<number | null>(null);
  const readyCount = images.filter((image) => image.src && !image.uploading && !image.error).length;
  const selectedInsertTarget =
    insertTargets.find((target) => target.index === selectedInsertTargetIndex) ?? insertTargets[0];

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
              <p className={labelClass}>Onde a galeria entra</p>
              <select
                value={selectedInsertTargetIndex}
                onChange={(event) => onUpdateInsertTarget(Number(event.target.value))}
                className={compactFieldClass}
              >
                {insertTargets.map((target) => (
                  <option key={`${target.index}-${target.pos}`} value={target.index}>
                    {target.label}
                  </option>
                ))}
              </select>
              {selectedInsertTarget && (
                <p className="mt-2 text-xs leading-5 text-slate-500">{selectedInsertTarget.hint}</p>
              )}
            </div>

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
                        <img src={image.src} alt="" className="h-full w-full object-contain bg-white" />
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
                      <figcaption className="px-2 pb-1 pt-2 text-xs text-slate-500">
                        {image.convertedToWebp ? "Convertida para WebP automaticamente" : "Pronta para inserir"}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Depois de inserir, clique em uma imagem no editor para ajustar titulo, texto alternativo e link.</p>
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

function VideoDialog({
  pendingVideo,
  insertTargets,
  selectedInsertTargetIndex,
  onClose,
  onInsert,
  onPickVideo,
  onUpdateInsertTarget,
  onUpdateVideo,
  uploading,
}: {
  pendingVideo: PendingVideo | null;
  insertTargets: GalleryInsertTarget[];
  selectedInsertTargetIndex: number;
  onClose: () => void;
  onInsert: () => void;
  onPickVideo: () => void;
  onUpdateInsertTarget: (targetIndex: number) => void;
  onUpdateVideo: (patch: Partial<PendingVideo>) => void;
  uploading: boolean;
}) {
  const selectedInsertTarget =
    insertTargets.find((target) => target.index === selectedInsertTargetIndex) ?? insertTargets[0];
  const canInsert = Boolean(pendingVideo?.src && !pendingVideo.uploading && !pendingVideo.error);

  return (
    <DialogShell onClose={onClose} label="Fechar video">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1220] shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Video no conteudo</p>
            <h3 className="mt-1 text-2xl font-semibold text-white">Adicionar video ao corpo da materia</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Suba um video curto, escolha se ele entra em formato horizontal ou vertical e defina onde esse bloco aparece no fluxo das camadas.
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
              onClick={onPickVideo}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d9c5a4]/40 bg-[#f5ead7]/10 px-4 py-5 text-sm font-semibold text-[#f5ead7] transition hover:bg-[#f5ead7]/18 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
              {uploading ? "Enviando video..." : "Selecionar video"}
            </button>

            <div className="mt-6">
              <p className={labelClass}>Onde o video entra</p>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <select
                  value={selectedInsertTargetIndex}
                  onChange={(event) => onUpdateInsertTarget(Number(event.target.value))}
                  className={compactFieldClass}
                >
                  {insertTargets.map((target) => (
                    <option key={target.index} value={target.index}>
                      {target.label}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {selectedInsertTarget?.hint ?? "O video sera inserido no ponto selecionado do conteudo."}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className={labelClass}>Formato do video</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "horizontal", label: "Horizontal", hint: "16:9 editorial" },
                  { value: "vertical", label: "Vertical", hint: "9:16 estilo social" },
                ].map((option) => {
                  const active = pendingVideo?.orientation === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onUpdateVideo({ orientation: option.value as VideoOrientation })}
                      className={cn(
                        "rounded-2xl border px-4 py-4 text-left transition",
                        active
                          ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                      )}
                    >
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{option.hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <label className={labelClass}>Titulo do video</label>
              <input
                type="text"
                value={pendingVideo?.title ?? ""}
                onChange={(event) => onUpdateVideo({ title: event.target.value })}
                className={compactFieldClass}
                placeholder="Legenda curta para o video"
              />
            </div>
          </aside>

          <div className="flex min-h-0 flex-col bg-[#0b1220] p-5">
            <div className="flex-1 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#09111f_0%,#0f172a_100%)] p-5">
              {!pendingVideo ? (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 text-center text-slate-400">
                  <Film className="h-10 w-10 text-slate-600" />
                  <p className="mt-4 text-lg font-semibold text-white">Nenhum video selecionado</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Selecione um arquivo MP4, WebM ou MOV para inserir um bloco de video no conteudo.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={cn(
                      "mx-auto overflow-hidden rounded-[28px] border border-white/10 bg-black/50 shadow-[0_24px_60px_rgba(0,0,0,0.32)]",
                      pendingVideo.orientation === "vertical" ? "max-w-[360px]" : "max-w-[860px]"
                    )}
                  >
                    {pendingVideo.src ? (
                      <video
                        key={pendingVideo.src}
                        src={pendingVideo.src}
                        controls
                        playsInline
                        preload="metadata"
                        className="block aspect-auto w-full bg-black object-contain"
                      />
                    ) : (
                      <div className="flex min-h-[280px] items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-200" />
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                    <p className="font-semibold text-white">{pendingVideo.fileName}</p>
                    <p className="mt-1 text-slate-500">
                      {pendingVideo.width && pendingVideo.height
                        ? `${pendingVideo.width}x${pendingVideo.height} · ${pendingVideo.orientation}`
                        : `Formato ${pendingVideo.orientation}`}
                    </p>
                    {pendingVideo.error ? <p className="mt-2 text-rose-300">{pendingVideo.error}</p> : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Videos verticais e horizontais entram como blocos independentes dentro das camadas do conteudo.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">
              Cancelar
            </button>
            <button
              type="button"
              onClick={onInsert}
              disabled={!canInsert}
              className="rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Inserir video no texto
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

function EditorToolbar({
  editor,
  onLinkClick,
  onImageClick,
  onVideoClick,
}: {
  editor: Editor | null;
  onLinkClick: () => void;
  onImageClick: () => void;
  onVideoClick: () => void;
}) {
  if (!editor) return null;
  const buttonClass = (active = false) =>
    cn(
      "inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm transition",
      active ? "bg-[#102033] text-white shadow-[0_12px_30px_rgba(16,32,51,0.18)]" : "text-[#6d7b88] hover:bg-[#efe7da] hover:text-[#102033]"
    );

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-[20px] border border-[#e7dccd] bg-[rgba(255,253,248,0.98)] p-2 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
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
      <button type="button" title="Alinhar a esquerda" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={buttonClass(editor.isActive({ textAlign: "left" }))}><AlignLeft className="h-4 w-4" /></button>
      <button type="button" title="Centralizar" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={buttonClass(editor.isActive({ textAlign: "center" }))}><AlignCenter className="h-4 w-4" /></button>
      <button type="button" title="Alinhar a direita" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={buttonClass(editor.isActive({ textAlign: "right" }))}><AlignRight className="h-4 w-4" /></button>
      <button type="button" title="Justificar" onClick={() => editor.chain().focus().setTextAlign("justify").run()} className={buttonClass(editor.isActive({ textAlign: "justify" }))}><AlignJustify className="h-4 w-4" /></button>
      <ToolbarDivider />
      <button type="button" title="Link" onClick={onLinkClick} className={buttonClass(editor.isActive("link"))}><Link2 className="h-4 w-4" /></button>
      <button type="button" title="Imagem" onClick={onImageClick} className={buttonClass()}><ImagePlus className="h-4 w-4" /></button>
      <button type="button" title="Video" onClick={onVideoClick} className={buttonClass(editor.isActive("videoBlock"))}><Film className="h-4 w-4" /></button>
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
