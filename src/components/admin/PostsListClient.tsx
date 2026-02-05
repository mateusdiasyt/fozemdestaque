"use client";

import { useState } from "react";
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

export function PostsListClient({
  posts,
  categories,
}: {
  posts: Post[];
  categories: Category[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

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

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Título</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Categoria</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Data</th>
            <th className="text-right py-3 px-4 font-medium text-slate-600">Ações</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {post.featured && (
                    <span className="text-amber-500 text-xs font-medium">★</span>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
