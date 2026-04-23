"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import {
  Bold,
  CalendarClock,
  Clock3,
  Eye,
  FileText,
  Heading2,
  Heading3,
  Heading4,
  HelpCircle,
  ImagePlus,
  Italic,
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
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [uploadingContentImage, setUploadingContentImage] = useState(false);
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis | null>(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [helpPopup, setHelpPopup] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setHelpPopup(false);
      setLinkPopup(false);
      setImagePopup(false);
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
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "rounded-2xl border border-slate-200 shadow-sm" },
      }),
      LinkWithRel.configure({ openOnClick: false, HTMLAttributes: { rel: "follow" } }),
      TableKit,
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
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setUploadingContentImage(true);
    setUploadError("");
    try {
      const url = await uploadImage(file);
      setImageUrl(url);
      setImageAlt(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Nao foi possivel enviar a imagem");
    } finally {
      setUploadingContentImage(false);
    }
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
    const src = imageUrl.trim();
    if (!src || !editor) return;
    editor.chain().focus().setImage({ src, alt: imageAlt.trim() || undefined }).run();
    setImagePopup(false);
    setImageUrl("");
    setImageAlt("");
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
      <input ref={contentImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleContentImageUpload} />
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
            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#edf2f7] shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
              <EditorToolbar editor={editor} onLinkClick={openLinkPopup} onImageClick={() => setImagePopup(true)} />
              <EditorContent editor={editor} />
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
        <DialogShell onClose={() => setImagePopup(false)} label="Fechar imagem">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#0b1220] p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Midia no conteudo</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Inserir imagem na materia</h3>
                <p className="mt-2 text-sm text-slate-400">Envie uma imagem ou cole uma URL. O alt text ajuda em acessibilidade e SEO.</p>
              </div>
              <button type="button" onClick={() => setImagePopup(false)} className="rounded-xl p-2 text-slate-300 hover:bg-white/10" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
              <div className="space-y-4">
                <button type="button" onClick={() => contentImageInputRef.current?.click()} disabled={uploadingContentImage} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-300/10 px-4 py-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60">
                  {uploadingContentImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  {uploadingContentImage ? "Enviando imagem..." : "Enviar do computador"}
                </button>
                <div>
                  <label className={labelClass}>URL da imagem</label>
                  <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Alt text</label>
                  <input type="text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Descreva a imagem para leitores e buscadores" className={fieldClass} />
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="h-full min-h-[220px] w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                ) : (
                  <div className="flex h-full min-h-[220px] items-center justify-center px-6 text-center text-sm text-slate-500">A previa aparece aqui assim que uma imagem for selecionada.</div>
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={insertImageIntoContent} disabled={!imageUrl.trim()} className="rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">Inserir no texto</button>
              <button type="button" onClick={() => setImagePopup(false)} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">Cancelar</button>
            </div>
          </div>
        </DialogShell>
      )}
    </form>
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
