"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
}

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", active: true });
  const [loading, setLoading] = useState(false);

  async function handleSave(id?: string) {
    setLoading(true);
    try {
      const url = id ? `/api/admin/categories/${id}` : "/api/admin/categories";
      const method = id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug || undefined,
          description: form.description || undefined,
          active: form.active,
        }),
      });
      if (res.ok) {
        setEditing(null);
        setCreating(false);
        setForm({ name: "", slug: "", description: "", active: true });
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta categoria?")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => { setCreating(true); setForm({ name: "", slug: "", description: "", active: true }); }}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Plus className="w-4 h-4" />
        Nova Categoria
      </button>

      {creating && (
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <h3 className="font-medium mb-3">Nova categoria</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              placeholder="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              placeholder="Slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Ativa
            </label>
          </div>
          <textarea
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg mb-3"
            rows={2}
          />
          <div className="flex gap-2">
            <button onClick={() => handleSave()} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Salvar
            </button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4">Nome</th>
              <th className="text-left py-3 px-4">Slug</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b hover:bg-slate-50">
                {editing === cat.id ? (
                  <>
                    <td colSpan={4} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <input
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="px-3 py-2 border rounded-lg"
                          placeholder="Nome"
                        />
                        <input
                          value={form.slug}
                          onChange={(e) => setForm({ ...form, slug: e.target.value })}
                          className="px-3 py-2 border rounded-lg"
                          placeholder="Slug"
                        />
                        <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativa</label>
                      </div>
                      <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg mb-3" rows={2} placeholder="Descrição" />
                      <div className="flex gap-2">
                        <button onClick={() => handleSave(cat.id)} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Salvar</button>
                        <button onClick={() => setEditing(null)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-4 font-medium">{cat.name}</td>
                    <td className="py-3 px-4 text-slate-600">{cat.slug}</td>
                    <td className="py-3 px-4">
                      <span className={cn("px-2 py-0.5 rounded text-xs", cat.active ? "bg-green-200 text-green-800" : "bg-slate-200")}>
                        {cat.active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => { setEditing(cat.id); setForm({ name: cat.name, slug: cat.slug, description: cat.description ?? "", active: cat.active }); }} className="p-2 text-slate-500 hover:text-blue-600">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-2 text-slate-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
