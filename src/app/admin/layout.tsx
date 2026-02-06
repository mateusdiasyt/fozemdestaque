import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { auth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user?.role as keyof typeof PERMISSIONS) ?? "colaborador";
  const permissions = [...(PERMISSIONS[role] ?? [])];

  // Página de login não tem sidebar
  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 font-poppins">
      <AdminSidebar user={session.user} permissions={permissions} />
      <main className="flex-1 overflow-auto p-6 bg-slate-900/50">{children}</main>
    </div>
  );
}
