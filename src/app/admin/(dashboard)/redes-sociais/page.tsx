import { redirect } from "next/navigation";
import { auth, hasPermission } from "@/lib/auth";
import { SocialLinksManager } from "@/components/admin/SocialLinksManager";

export default async function AdminSocialLinksPage() {
  const session = await auth();
  const role =
    (session?.user?.role as "administrador" | "editor" | "colaborador") ??
    "colaborador";

  if (!session?.user || !hasPermission(role, "settings")) {
    redirect("/admin");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6 tracking-tight">
        Redes Sociais
      </h1>
      <SocialLinksManager />
    </div>
  );
}
