"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
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
  Link2,
  Image as ImageIcon,
  Loader2,
  Check,
  AlertCircle,
  TrendingUp,
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
  categoryId?: string | null;
  status: string;
  featured: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
}

interface PostEditorProps {
  post?: Post;
  categories: Category[];
}

export function PostEditor({ post, categories }: PostEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage ?? "");
  const [categoryId, setCategoryId] = useState(post?.categoryId ?? "");
  const [status, setStatus] = useState(post?.status ?? "rascunho");
  const [featured, setFeatured] = useState(post?.featured ?? false);
  const [metaTitle, setMetaTitle] = useState(post?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription ?? "");
  const [focusKeyword, setFocusKeyword] = useState(post?.focusKeyword ?? "");
  const [loading, setLoading] = useState(false);
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis | null>(null);
  const [seoLoading, setSeoLoading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: true }),
      Link.configure({ openOnClick: false }),
    ],
    content: post?.content ?? "",
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none min-h-[300px] px-4 py-3 focus:outline-none",
      },
    },
  });

  const updateSlugFromTitle = useCallback(() => {
    if (!post && title) setSlug(slugify(title));
  }, [title, post]);

  useEffect(() => {
    updateSlugFromTitle();
  }, [updateSlugFromTitle]);

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
    setLoading(true);
    try {
      const body = {
        title,
        slug: slug || slugify(title),
        excerpt: excerpt || undefined,
        content: editor?.getHTML() ?? "",
        featuredImage: featuredImage || undefined,
        categoryId: categoryId || undefined,
        status,
        featured,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
        focusKeyword: focusKeyword || undefined,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="url-amigavel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Resumo</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Conteúdo</label>
            <EditorToolbar editor={editor} />
            <div className="border border-slate-300 rounded-b-lg overflow-hidden">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-3">Publicação</h3>
            <div className="space-y-3">
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                  />
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
                <label className="block text-sm text-slate-600 mb-1">Imagem de destaque (URL)</label>
                <input
                  type="url"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-3">SEO</h3>
            <button
              type="button"
              onClick={analyzeSEO}
              disabled={seoLoading}
              className="mb-3 flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-sm"
            >
              {seoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              Analisar SEO
            </button>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Meta Title</label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  maxLength={70}
                  placeholder={title || "Título da página"}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Meta Description</label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  maxLength={160}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded"
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
            </div>
            {seoAnalysis && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs space-y-2">
                <div className={cn("font-medium flex items-center gap-2", statusColors[seoAnalysis.overall])}>
                  {seoAnalysis.overall === "good" && <Check className="w-4 h-4" />}
                  {seoAnalysis.overall === "bad" && <AlertCircle className="w-4 h-4" />}
                  SEO {seoAnalysis.overall === "good" ? "Bom" : seoAnalysis.overall === "medium" ? "Médio" : "Ruim"}
                </div>
                <p className={statusColors[seoAnalysis.metaTitle.status]}>{seoAnalysis.metaTitle.message}</p>
                <p className={statusColors[seoAnalysis.metaDescription.status]}>{seoAnalysis.metaDescription.message}</p>
                <p className={statusColors[seoAnalysis.focusKeyword.status]}>{seoAnalysis.focusKeyword.message}</p>
                <p className={statusColors[seoAnalysis.headings.structure]}>{seoAnalysis.headings.message}</p>
                <p className={statusColors[seoAnalysis.contentLength.status]}>{seoAnalysis.contentLength.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
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
    </form>
  );
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div className="flex gap-1 p-2 bg-slate-100 border border-slate-300 border-b-0 rounded-t-lg">
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
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className="p-2 rounded hover:bg-slate-200">
        <List className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className="p-2 rounded hover:bg-slate-200">
        <ListOrdered className="w-4 h-4" />
      </button>
    </div>
  );
}
