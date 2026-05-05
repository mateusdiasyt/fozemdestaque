import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { Cake, FileText, MessageSquare, Users } from "lucide-react";
import { db } from "@/lib/db";
import { birthdaySubmissions, comments, posts, users } from "@/lib/db/schema";

type DashboardStats = {
  postsCount: number | null;
  publishedCount: number | null;
  pendingComments: number | null;
  usersCount: number | null;
  aniversariosCount: number | null;
};

export default async function AdminDashboardPage() {
  const statsResult = await getDashboardStats();
  const statsUnavailable = !statsResult.ok;

  const stats = [
    {
      label: "Total de Posts",
      value: formatStatValue(statsResult.data.postsCount, statsUnavailable),
      icon: FileText,
      href: "/admin/posts",
      color: "bg-blue-500",
    },
    {
      label: "Posts Publicados",
      value: formatStatValue(statsResult.data.publishedCount, statsUnavailable),
      icon: FileText,
      href: "/admin/posts?status=publicado",
      color: "bg-green-500",
    },
    {
      label: "Comentarios Pendentes",
      value: formatStatValue(statsResult.data.pendingComments, statsUnavailable),
      icon: MessageSquare,
      href: "/admin/comments",
      color: "bg-amber-500",
    },
    {
      label: "Total de Usuarios",
      value: formatStatValue(statsResult.data.usersCount, statsUnavailable),
      icon: Users,
      href: "/admin/users",
      color: "bg-purple-500",
    },
    {
      label: "Inscricoes Aniversario",
      value: formatStatValue(statsResult.data.aniversariosCount, statsUnavailable),
      icon: Cake,
      href: "/admin/aniversarios",
      color: "bg-pink-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-400">
          Visao geral rapida do painel, com acesso direto aos modulos principais.
        </p>
      </div>

      {statsUnavailable ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
          As estatisticas do painel estao temporariamente indisponiveis. O acesso rapido continua funcionando, mas o banco respondeu com limitacao de cota nesta leitura.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-800/50 p-6 transition-colors hover:bg-slate-800"
          >
            <div className={`rounded-lg p-3 text-white ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

async function getDashboardStats(): Promise<
  | { ok: true; data: DashboardStats }
  | { ok: false; data: DashboardStats }
> {
  try {
    const [postsCount] = await db.select({ count: sql<number>`count(*)` }).from(posts);
    const [publishedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.status, "publicado"));
    const [pendingComments] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.approved, false));
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [aniversariosCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(birthdaySubmissions);

    return {
      ok: true,
      data: {
        postsCount: Number(postsCount?.count ?? 0),
        publishedCount: Number(publishedCount?.count ?? 0),
        pendingComments: Number(pendingComments?.count ?? 0),
        usersCount: Number(usersCount?.count ?? 0),
        aniversariosCount: Number(aniversariosCount?.count ?? 0),
      },
    };
  } catch (error) {
    console.error("[admin/dashboard] failed to load stats", error);
    return {
      ok: false,
      data: {
        postsCount: null,
        publishedCount: null,
        pendingComments: null,
        usersCount: null,
        aniversariosCount: null,
      },
    };
  }
}

function formatStatValue(value: number | null, unavailable: boolean) {
  if (unavailable || value === null) return "—";
  return String(value);
}
