import { redirect } from "next/navigation";
import { auth, hasPermission } from "@/lib/auth";
import { CustomizationManager } from "@/components/admin/CustomizationManager";

export default async function AdminCustomizationPage() {
  const session = await auth();
  const role =
    (session?.user?.role as "administrador" | "editor" | "colaborador") ??
    "colaborador";

  if (!session?.user || !hasPermission(role, "settings")) {
    redirect("/admin");
  }

  return <CustomizationManager />;
}
