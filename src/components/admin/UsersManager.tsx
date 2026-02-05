"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
}

export function UsersManager({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ email: string; name: string; password: string; role: "administrador" | "editor" | "colaborador" }>({ email: "", name: "", password: "", role: "colaborador" });
  const [loading, setLoading] = useState(false);

  async function handleSave(id?: string) {
    setLoading(true);
    try {
      const url = id ? `/api/admin/users/${id}` : "/api/admin/users";
      const method = id ? "PATCH" : "POST";
      const body: Record<string, unknown> = { email: form.email, name: form.name, role: form.role };
      if (form.password) body.password = form.password;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditing(null);
        setCreating(false);
        setForm({ email: "", name: "", password: "", role: "colaborador" });
        router.refresh();
      } else {
        const err = await res.json();
        alert(err?.error?.message ?? "Erro");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (id === currentUserId) {
      alert("Não é possível remover seu próprio usuário");
      return;
    }
    if (!confirm("Remover este usuário?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert((await res.json())?.error ?? "Erro");
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => { setCreating(true); setForm({ email: "", name: "", password: "", role: "colaborador" }); }}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Plus className="w-4 h-4" />
        Novo Usuário
      </button>

      {creating && (
        <div className="p-4 bg-white rounded-xl border">
          <h3 className="font-medium mb-3">Novo usuário</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 border rounded-lg" required />
            <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border rounded-lg" required />
            <input type="password" placeholder="Senha (mín. 6)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="px-3 py-2 border rounded-lg" required />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "administrador" | "editor" | "colaborador" })} className="px-3 py-2 border rounded-lg">
              <option value="administrador">Administrador</option>
              <option value="editor">Editor</option>
              <option value="colaborador">Colaborador</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSave()} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Salvar</button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4">Nome</th>
              <th className="text-left py-3 px-4">Email</th>
              <th className="text-left py-3 px-4">Perfil</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b hover:bg-slate-50">
                <td className="py-3 px-4 font-medium">{u.name}</td>
                <td className="py-3 px-4 text-slate-600">{u.email}</td>
                <td className="py-3 px-4 capitalize">{u.role}</td>
                <td className="py-3 px-4">
                  <span className={cn("px-2 py-0.5 rounded text-xs", u.active ? "bg-green-200" : "bg-slate-200")}>{u.active ? "Ativo" : "Inativo"}</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button onClick={() => { setEditing(u.id); setForm({ email: u.email, name: u.name, password: "", role: u.role as "administrador" | "editor" | "colaborador" }); }} className="p-2 text-slate-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(u.id)} disabled={u.id === currentUserId} className="p-2 text-slate-500 hover:text-red-600 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
