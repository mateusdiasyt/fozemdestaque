import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { UsersManager } from "@/components/admin/UsersManager";

export default async function AdminUsersPage() {
  const session = await auth();
  const all = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    active: users.active,
    createdAt: users.createdAt,
  }).from(users);
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Usuários</h1>
      <UsersManager users={all} currentUserId={session?.user?.id} />
    </div>
  );
}
