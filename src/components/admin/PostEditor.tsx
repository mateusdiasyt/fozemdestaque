"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import { slugify } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { SEOAnalysis } from "@/lib/seo-analyzer";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Heading4,
  Link2,
  Table,
  Loader2,
  Check,
  AlertCircle,
  TrendingUp,
  X,
} from "lucide-react";

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

export function PostEditor({ post, categories }: PostEditorProps) {
  const router = useRouter();
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
    const v = post?.scheduledAt;
    if (!v) return "";
    const d = v instanceof Date ? v : new Date(v);
    return d.toISOString().slice(0, 16);
  });
  const [faqItems, setFaqItems] = useState<{ q: string; a: string }[]>([]);
  const [linkPopup, setLinkPopup] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkRel, setLinkRel] = useState<"follow" | "nofollow" | "sponsored">("follow");
  const [loading, setLoading] = useState(false);
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis | null>(null);
  const [seoLoading, setSeoLoading] = useState(false);

  useEffect(() => {
    if (post?.faqJson) {
      try {
        const parsed = JSON.parse(post.faqJson);
        const mainEntity = parsed["@graph"]?.[0] ?? parsed;
        const faq = mainEntity?.mainEntity ?? [];
        setFaqItems(faq.map((item: { name: string; acceptedAnswer: { text: string } }) => ({ q: item.name, a: item.acceptedAnswer?.text ?? "" })));
      } catch {
        setFaqItems([]);
      }
    }
  }, [post?.faqJson]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Image.configure({ inline: true }),
      LinkWithRel.configure({ openOnClick: false, HTMLAttributes: { rel: "follow" } }),
      TableKit,
    ],
    content: post?.content ?? "",
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none min-h-[180px] px-4 py-3 focus:outline-none",
      },
    },
  });

  const updateSlugFromTitle = useCallback(() => {
    if (!post && title) setSlug(slugify(title));
  }, [title, post]);

  useEffect(() => {
    updateSlugFromTitle();
  }, [updateSlugFromTitle]);

  const wordCount = editor ? (editor.getText().replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length || 0) : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const metaTitleLen = (metaTitle || title).length;
  const metaDescLen = (metaDescription || excerpt).length;
  const metaTitleColor = metaTitleLen <= 50 ? "text-green-600" : metaTitleLen <= 60 ? "text-amber-600" : "text-red-600";
  const metaDescColor = metaDescLen >= 120 && metaDescLen <= 160 ? "text-green-600" : metaDescLen >= 100 ? "text-amber-600" : "text-red-600";

  const slugWarnings: string[] = [];
  if (slug.length > 60) slugWarnings.push("URL muito longa (>60 chars)");
  if (focusKeyword && slug && !slug.toLowerCase().includes(focusKeyword.toLowerCase())) {
    slugWarnings.push("Keyword não está na URL");
  }

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
        body: JSON.stringify({
          title,
          content,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          focusKeyword: focusKeyword || undefined,
        }),
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
      alert("Alt Text da imagem de destaque é obrigatório para SEO.");
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

  const statusColors = { good: "text-green-600", medium: "text-amber-600", bad: "text-red-600" };
  const displayTitle = metaTitle || title || "Título da página";
  const displayDesc = metaDescription || excerpt || "Meta description...";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full w-full max-w-6xl">
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 space-y-3 overflow-y-auto min-h-0">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-0.5">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-0.5">Slug (URL)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="url-amigavel"
            />
            {slugWarnings.length > 0 && (
              <p className="text-xs text-amber-600 mt-1">{slugWarnings.join(" • ")}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-0.5">Resumo</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={1}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-0.5">Conteúdo</label>
            <EditorToolbar editor={editor} onLinkClick={openLinkPopup} />
            <div className="border border-slate-300 rounded-b-lg overflow-hidden">
              <EditorContent editor={editor} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {wordCount} palavras • ~{readTime} min de leitura
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-8rem)] overflow-y-auto min-h-0 content-start">
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-2 text-sm">Publicação</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="rascunho">Rascunho</option>
                  <option value="em_analise">Em análise</option>
                  <option value="publicado">Publicado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Agendar publicação</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
                  Destaque
                </label>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Selecione</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Imagem de destaque (URL)</label>
                <input
                  type="url"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
                {featuredImage && (
                  <div className="mt-1.5 rounded-lg overflow-hidden border border-slate-200 max-h-20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={featuredImage} alt="" className="w-full h-auto object-contain max-h-20" onError={(e) => (e.currentTarget.style.display = "none")} />
                  </div>
                )}
                <label className="block text-sm text-slate-600 mt-2 mb-1">Alt Text (obrigatório para SEO) *</label>
                <input
                  type="text"
                  value={featuredImageAlt}
                  onChange={(e) => setFeaturedImageAlt(e.target.value)}
                  placeholder="Descrição da imagem"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-2 text-sm">SEO</h3>
            <button
              type="button"
              onClick={analyzeSEO}
              disabled={seoLoading}
              className="mb-2 flex items-center gap-2 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs"
            >
              {seoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
              Analisar SEO
            </button>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Meta Title</span>
                  <span className={cn("font-medium", metaTitleColor)}>{(metaTitle || title).length}/60</span>
                </div>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  maxLength={70}
                  placeholder={title || "Título da página"}
                  className={cn("w-full px-2 py-1.5 text-sm border rounded", metaTitleLen <= 60 ? "border-slate-300" : "border-amber-500")}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Meta Description</span>
                  <span className={cn("font-medium", metaDescColor)}>{(metaDescription || excerpt).length}/160</span>
                </div>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  maxLength={165}
                  rows={1}
                  className={cn("w-full px-2 py-1.5 text-sm border rounded", metaDescLen >= 120 && metaDescLen <= 160 ? "border-slate-300" : "border-amber-500")}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Palavra-chave foco</label>
                <input
                  type="text"
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Canonical URL</label>
                <input
                  type="url"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded"
                />
              </div>
            </div>

            <details className="mt-2 group">
              <summary className="text-xs font-medium text-slate-600 cursor-pointer hover:text-slate-800">Preview & Análise</summary>
              <div className="mt-2 space-y-2">
                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-xs">
                  <p className="text-blue-600 font-medium truncate">{displayTitle}</p>
                  <p className="text-green-700">{typeof window !== "undefined" ? window.location.origin : ""}/post/{slug || "url"}</p>
                  <p className="text-slate-600 line-clamp-2">{displayDesc}</p>
                </div>
                {densityCheck && focusKeyword && (
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 text-xs space-y-0.5">
                    <p className={densityCheck.h1 ? "text-green-600" : "text-slate-500"}>H1: {densityCheck.h1 ? "✓" : "✗"}</p>
                    <p className={densityCheck.firstP ? "text-green-600" : "text-slate-500"}>1º parágrafo: {densityCheck.firstP ? "✓" : "✗"}</p>
                    <p className={densityCheck.url ? "text-green-600" : "text-slate-500"}>URL: {densityCheck.url ? "✓" : "✗"}</p>
                  </div>
                )}
                {seoAnalysis && (
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                    <p className={cn("font-medium", statusColors[seoAnalysis.overall])}>SEO: {seoAnalysis.overall === "good" ? "Bom" : seoAnalysis.overall === "medium" ? "Médio" : "Ruim"}</p>
                    <p className={statusColors[seoAnalysis.metaTitle.status]}>{seoAnalysis.metaTitle.message}</p>
                    <p className={statusColors[seoAnalysis.metaDescription.status]}>{seoAnalysis.metaDescription.message}</p>
                  </div>
                )}
              </div>
            </details>
          </div>

          <details className="bg-white rounded-xl border border-slate-200 group">
            <summary className="font-semibold text-slate-800 p-3 cursor-pointer hover:bg-slate-50 rounded-xl text-sm">FAQ (JSON-LD)</summary>
            <div className="px-3 pb-3 pt-0 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2 mt-2">Perguntas e respostas para Featured Snippets</p>
              {faqItems.map((item, i) => (
              <div key={i} className="mb-2 p-2 bg-slate-50 rounded-lg flex gap-2">
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={item.q}
                    onChange={(e) => updateFaqItem(i, "q", e.target.value)}
                    placeholder="Pergunta"
                    className="w-full px-2 py-1.5 text-sm border rounded"
                  />
                  <textarea
                    value={item.a}
                    onChange={(e) => updateFaqItem(i, "a", e.target.value)}
                    placeholder="Resposta"
                    rows={1}
                    className="w-full px-2 py-1.5 text-sm border rounded resize-none"
                  />
                </div>
                <button type="button" onClick={() => removeFaqItem(i)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addFaqItem} className="text-sm text-blue-600 hover:underline">
              + Adicionar FAQ
            </button>
            </div>
          </details>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {post ? "Salvar" : "Criar"}
        </button>
        {post && (
          <a
            href={`/post/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Visualizar
          </a>
        )}
      </div>

      {linkPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-xl shadow-xl max-w-md w-full mx-4">
            <h3 className="font-semibold mb-3">Inserir link</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border rounded-lg mb-3"
              autoFocus
            />
            <div className="flex gap-2 mb-3">
              {(["follow", "nofollow", "sponsored"] as const).map((r) => (
                <label key={r} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" checked={linkRel === r} onChange={() => setLinkRel(r)} />
                  {r}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={applyLink} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                Aplicar
              </button>
              <button type="button" onClick={() => setLinkPopup(false)} className="px-4 py-2 border rounded-lg">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function EditorToolbar({ editor, onLinkClick }: { editor: Editor | null; onLinkClick: () => void }) {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap gap-1 p-1.5 bg-slate-100 border border-slate-300 border-b-0 rounded-t-lg">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className="p-2 rounded hover:bg-slate-200">
        <Bold className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className="p-2 rounded hover:bg-slate-200">
        <Italic className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="p-2 rounded hover:bg-slate-200">
        <Heading2 className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className="p-2 rounded hover:bg-slate-200">
        <Heading3 className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} className="p-2 rounded hover:bg-slate-200">
        <Heading4 className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className="p-2 rounded hover:bg-slate-200">
        <List className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className="p-2 rounded hover:bg-slate-200">
        <ListOrdered className="w-4 h-4" />
      </button>
      <button type="button" onClick={onLinkClick} className="p-2 rounded hover:bg-slate-200">
        <Link2 className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="p-2 rounded hover:bg-slate-200">
        <Table className="w-4 h-4" />
      </button>
    </div>
  );
}
