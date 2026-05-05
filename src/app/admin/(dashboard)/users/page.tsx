import { AdminDataWarning } from "@/components/admin/AdminDataWarning";
import { UsersManager } from "@/components/admin/UsersManager";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { safeAdminQuery } from "@/lib/safe-admin-query";

type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: Date;
};

export default async function AdminUsersPage() {
  const session = await auth();
  const usersResult = await safeAdminQuery<AdminUserRow[]>(
    async () =>
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          active: users.active,
          createdAt: users.createdAt,
        })
        .from(users),
    [],
    "users"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-slate-100">Usuarios</h1>
        <p className="text-sm text-slate-400">Controle de acessos internos do portal.</p>
      </div>

      {usersResult.unavailable ? <AdminDataWarning /> : null}

      <UsersManager users={usersResult.data} currentUserId={session?.user?.id} />
    </div>
  );
}
