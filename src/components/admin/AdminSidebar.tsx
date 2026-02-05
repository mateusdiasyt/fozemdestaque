"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  MessageSquare,
  Users,
  Image,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  user: { name?: string | null; email?: string | null; role?: string };
  permissions: readonly string[];
}

const menuItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "posts" },
  { href: "/admin/posts", label: "Posts", icon: FileText, perm: "posts" },
  { href: "/admin/categories", label: "Categorias", icon: FolderTree, perm: "categories" },
  { href: "/admin/comments", label: "Comentários", icon: MessageSquare, perm: "comments" },
  { href: "/admin/users", label: "Usuários", icon: Users, perm: "users" },
  { href: "/admin/banners", label: "Banners", icon: Image, perm: "banners" },
];

export function AdminSidebar({ user, permissions }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-800 text-white flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <Link href="/admin" className="text-xl font-bold">
          Foz em Destaque
        </Link>
        <p className="text-sm text-slate-400 mt-1">Painel Admin</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          if (!permissions.includes(item.perm)) return null;
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <div className="text-sm text-slate-400 truncate">{user.email}</div>
        <div className="text-xs text-slate-500 capitalize">{user.role}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="mt-3 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
