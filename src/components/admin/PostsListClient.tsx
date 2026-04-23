"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Eye, FileText, Pencil, Search, Star, Trash2 } from "lucide-react";
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
const ALL_STATUS = "__all_status__";
const PAGE_SIZE = 18;

const STATUS_OPTIONS = [
  { value: ALL_STATUS, label: "Todos" },
  { value: "publicado", label: "Publicados" },
  { value: "rascunho", label: "Rascunhos" },
  { value: "em_analise", label: "Em analise" },
];

const statusStyles: Record<string, string> = {
  rascunho: "border-slate-400/20 bg-slate-400/10 text-slate-300",
  em_analise: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  publicado: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  em_analise: "Em analise",
  publicado: "Publicado",
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatPostDate(post: Post) {
  const date = post.publishedAt ?? post.createdAt;
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_CATEGORIES);
  const [selectedStatus, setSelectedStatus] = useState<string>(ALL_STATUS);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]));
  }, [categories]);

  const categoryCards = useMemo(() => {
    return categories
      .map((category) => ({
        ...category,
        count: posts.filter((post) => post.categoryId === category.id).length,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [categories, posts]);

  const uncategorizedCount = useMemo(
    () => posts.filter((post) => !post.categoryId).length,
    [posts]
  );

  const publishedCount = useMemo(
    () => posts.filter((post) => post.status === "publicado").length,
    [posts]
  );

  const featuredCount = useMemo(
    () => posts.filter((post) => post.featured).length,
    [posts]
  );

  const filteredPosts = useMemo(() => {
    const normalizedSearch = normalizeText(search.trim());

    return posts.filter((post) => {
      const categoryName = categoryNameById.get(post.categoryId ?? "") ?? "Sem categoria";
      const matchesCategory =
        selectedCategoryId === ALL_CATEGORIES ||
        (selectedCategoryId === UNCATEGORIZED ? !post.categoryId : post.categoryId === selectedCategoryId);
      const matchesStatus = selectedStatus === ALL_STATUS || post.status === selectedStatus;
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(`${post.title} ${post.slug} ${categoryName}`).includes(normalizedSearch);

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [categoryNameById, posts, search, selectedCategoryId, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategoryId, selectedStatus]);

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

  function getCategoryName(id: string | null) {
    return categoryNameById.get(id ?? "") ?? "Sem categoria";
  }

  function setCategoryFilter(categoryId: string) {
    setSelectedCategoryId(categoryId);
  }

  return (
    <section className="space-y-5 rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#0c1324_0%,#080d18_100%)] p-5 shadow-[0_22px_70px_rgba(2,6,23,0.32)] md:p-6">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Total" value={posts.length} helper="posts cadastrados" icon={<FileText className="h-4 w-4" />} />
        <MetricCard label="Publicados" value={publishedCount} helper="visiveis no portal" icon={<Eye className="h-4 w-4" />} />
        <MetricCard label="Destaques" value={featuredCount} helper="marcados como destaque" icon={<Star className="h-4 w-4" />} />
        <MetricCard label="Resultado" value={filteredPosts.length} helper="apos os filtros" icon={<Search className="h-4 w-4" />} />
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto] xl:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por titulo, slug ou categoria"
              className="h-12 w-full rounded-full border border-white/10 bg-[#070d18] pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-[#dfe6ff]/60"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status.value}
                onClick={() => setSelectedStatus(status.value)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  selectedStatus === status.value
                    ? "border-[#dfe6ff]/40 bg-[#dfe6ff] text-[#091122]"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                )}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <CategoryChip
            active={selectedCategoryId === ALL_CATEGORIES}
            label="Todas"
            count={posts.length}
            onClick={() => setCategoryFilter(ALL_CATEGORIES)}
          />
          {categoryCards.map((category) => (
            <CategoryChip
              key={category.id}
              active={selectedCategoryId === category.id}
              label={category.name}
              count={category.count}
              onClick={() => setCategoryFilter(category.id)}
            />
          ))}
          {uncategorizedCount > 0 && (
            <CategoryChip
              active={selectedCategoryId === UNCATEGORIZED}
              label="Sem categoria"
              count={uncategorizedCount}
              onClick={() => setCategoryFilter(UNCATEGORIZED)}
            />
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#070d18]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Acervo editorial</p>
            <h2 className="mt-1 font-headline text-2xl font-semibold text-white">Posts encontrados</h2>
          </div>
          <p className="text-sm text-slate-400">
            Pagina {currentPage} de {totalPages}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-white/10 bg-white/[0.03]">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Titulo</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Categoria</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Data</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {paginatedPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-slate-400">
                    Nenhum post encontrado com estes filtros.
                  </td>
                </tr>
              ) : (
                paginatedPosts.map((post) => (
                  <tr key={post.id} className="transition-colors hover:bg-white/[0.035]">
                    <td className="px-4 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        {post.featured && (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dfe6ff]/20 bg-[#dfe6ff]/10 text-[#dfe6ff]">
                            <Star className="h-4 w-4" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-100">{post.title}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">/{post.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-300">{getCategoryName(post.categoryId)}</td>
                    <td className="px-4 py-4">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", statusStyles[post.status] ?? "border-white/10 bg-white/5 text-slate-400")}>
                        {statusLabels[post.status] ?? post.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-500" />
                        {formatPostDate(post)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/post/${post.slug}`}
                          target="_blank"
                          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                          title="Ver"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/posts/${post.id}`}
                          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={deleting === post.id}
                          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Mostrando {paginatedPosts.length} de {filteredPosts.length} posts filtrados
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Proxima
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.04] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-2 font-headline text-3xl font-semibold text-white">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dfe6ff]/20 bg-[#dfe6ff]/10 text-[#dfe6ff]">
          {icon}
        </span>
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "border-[#dfe6ff]/40 bg-[#dfe6ff] text-[#091122]"
          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
      )}
    >
      <span className="max-w-[12rem] truncate">{label}</span>
      <span className={cn("rounded-full px-2 py-0.5 text-[11px]", active ? "bg-[#091122]/10 text-[#091122]" : "bg-white/5 text-slate-500")}>{count}</span>
    </button>
  );
}
