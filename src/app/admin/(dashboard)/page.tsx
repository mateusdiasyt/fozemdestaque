import Link from "next/link";
import { db } from "@/lib/db";
import { posts, comments, users, birthdaySubmissions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { FileText, MessageSquare, Users, Cake } from "lucide-react";

export default async function AdminDashboardPage() {
  const [postsCount] = await db.select({ count: sql<number>`count(*)` }).from(posts);
  const [publishedCount] = await db.select({ count: sql<number>`count(*)` }).from(posts).where(eq(posts.status, "publicado"));
  const [pendingComments] = await db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.approved, false));
  const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [aniversariosCount] = await db.select({ count: sql<number>`count(*)` }).from(birthdaySubmissions);

  const stats = [
    { label: "Total de Posts", value: Number(postsCount?.count ?? 0), icon: FileText, href: "/admin/posts", color: "bg-blue-500" },
    { label: "Posts Publicados", value: Number(publishedCount?.count ?? 0), icon: FileText, href: "/admin/posts?status=publicado", color: "bg-green-500" },
    { label: "Comentários Pendentes", value: Number(pendingComments?.count ?? 0), icon: MessageSquare, href: "/admin/comments", color: "bg-amber-500" },
    { label: "Total de Usuários", value: Number(usersCount?.count ?? 0), icon: Users, href: "/admin/users", color: "bg-purple-500" },
    { label: "Inscrições Aniversário", value: Number(aniversariosCount?.count ?? 0), icon: Cake, href: "/admin/aniversarios", color: "bg-pink-500" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100 mb-6 tracking-tight">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="p-6 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg ${stat.color} text-white`}>
              <stat.icon className="w-6 h-6" />
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
