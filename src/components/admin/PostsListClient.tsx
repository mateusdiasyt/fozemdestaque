"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  featured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  categoryId: string | null;
}

interface Category {
  id: string;
  name: string;
}

const ALL_CATEGORIES = "__all__";
const UNCATEGORIZED = "__uncategorized__";

export function PostsListClient({
  posts,
  categories,
}: {
  posts: Post[];
  categories: Category[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_CATEGORIES);

  async function handleDelete(id: string) {
    if (!confirm("Remover este post?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  const getCategoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "-";

  const statusColors: Record<string, string> = {
    rascunho: "bg-slate-200 text-slate-700",
    em_analise: "bg-amber-200 text-amber-800",
    publicado: "bg-green-200 text-green-800",
  };

  const categoryCards = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        count: posts.filter((post) => post.categoryId === category.id).length,
      })),
    [categories, posts]
  );

  const uncategorizedCount = useMemo(
    () => posts.filter((post) => !post.categoryId).length,
    [posts]
  );

  const filteredPosts = useMemo(() => {
    if (selectedCategoryId === ALL_CATEGORIES) return posts;
    if (selectedCategoryId === UNCATEGORIZED) {
      return posts.filter((post) => !post.categoryId);
    }
    return posts.filter((post) => post.categoryId === selectedCategoryId);
  }, [posts, selectedCategoryId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setSelectedCategoryId(ALL_CATEGORIES)}
          className={cn(
            "rounded-xl border px-4 py-3 text-left transition-colors",
            selectedCategoryId === ALL_CATEGORIES
              ? "border-blue-500 bg-blue-50"
              : "border-slate-200 bg-white hover:border-blue-300"
          )}
        >
          <p className="text-xs text-slate-500">Categoria</p>
          <p className="text-sm font-semibold text-slate-800">Todas</p>
          <p className="text-xs text-slate-500 mt-1">{posts.length} posts</p>
        </button>

        {categoryCards.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategoryId(category.id)}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-colors",
              selectedCategoryId === category.id
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white hover:border-blue-300"
            )}
          >
            <p className="text-xs text-slate-500">Categoria</p>
            <p className="text-sm font-semibold text-slate-800 line-clamp-1">{category.name}</p>
            <p className="text-xs text-slate-500 mt-1">{category.count} posts</p>
          </button>
        ))}

        {uncategorizedCount > 0 && (
          <button
            onClick={() => setSelectedCategoryId(UNCATEGORIZED)}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-colors",
              selectedCategoryId === UNCATEGORIZED
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white hover:border-blue-300"
            )}
          >
            <p className="text-xs text-slate-500">Categoria</p>
            <p className="text-sm font-semibold text-slate-800">Sem categoria</p>
            <p className="text-xs text-slate-500 mt-1">{uncategorizedCount} posts</p>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-slate-600">{"T\u00edtulo"}</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Categoria</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">Data</th>
              <th className="text-right py-3 px-4 font-medium text-slate-600">{"A\u00e7\u00f5es"}</th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 px-4 text-center text-slate-500">
                  Nenhum post encontrado nesta categoria.
                </td>
              </tr>
            ) : (
              filteredPosts.map((post) => (
                <tr key={post.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {post.featured && (
                        <span className="text-amber-500 text-xs font-medium">{"\u2605"}</span>
                      )}
                      <span className="font-medium text-slate-800">{post.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{getCategoryName(post.categoryId)}</td>
                  <td className="py-3 px-4">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", statusColors[post.status] ?? "bg-slate-200")}>
                      {post.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-sm">
                    {post.publishedAt
                      ? format(new Date(post.publishedAt), "dd/MM/yyyy", { locale: ptBR })
                      : format(new Date(post.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/post/${post.slug}`}
                        target="_blank"
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Ver"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/posts/${post.id}`}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deleting === post.id}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
