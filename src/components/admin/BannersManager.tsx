"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const POSITIONS = [
  { value: "header", label: "Header (Carrossel)" },
  { value: "lateral_1", label: "Lateral 1" },
  { value: "lateral_2", label: "Lateral 2" },
  { value: "rodape", label: "Rodapé" },
] as const;

interface Banner {
  id: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
  order: number;
  active: boolean;
}

export function BannersManager({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", imageUrl: "", linkUrl: "", position: "header" as string, order: 0, active: true });
  const [loading, setLoading] = useState(false);

  async function handleSave(id?: string) {
    setLoading(true);
    try {
      const url = id ? `/api/admin/banners/${id}` : "/api/admin/banners";
      const method = id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title || undefined,
          imageUrl: form.imageUrl,
          linkUrl: form.linkUrl || undefined,
          position: form.position,
          order: form.order,
          active: form.active,
        }),
      });
      if (res.ok) {
        setEditing(null);
        setCreating(false);
        setForm({ title: "", imageUrl: "", linkUrl: "", position: "header", order: 0, active: true });
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este banner?")) return;
    const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setCreating(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Plus className="w-4 h-4" />
        Novo Banner
      </button>

      {creating && (
        <div className="p-4 bg-white rounded-xl border">
          <h3 className="font-medium mb-3">Novo banner</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input placeholder="Título (opcional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="px-3 py-2 border rounded-lg" />
            <input type="url" placeholder="URL da imagem *" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="px-3 py-2 border rounded-lg" required />
            <input type="url" placeholder="Link (opcional)" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} className="px-3 py-2 border rounded-lg" />
            <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="px-3 py-2 border rounded-lg">
              {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <input type="number" placeholder="Ordem" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value, 10) || 0 })} className="px-3 py-2 border rounded-lg" />
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo</label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSave()} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Salvar</button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banners.map((b) => (
          <div key={b.id} className="bg-white rounded-xl border overflow-hidden">
            <div className="aspect-video bg-slate-100 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt={b.title ?? ""} className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                {POSITIONS.find((p) => p.value === b.position)?.label ?? b.position}
              </span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <span className={cn("text-xs px-2 py-0.5 rounded", b.active ? "bg-green-200" : "bg-slate-200")}>{b.active ? "Ativo" : "Inativo"}</span>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(b.id); setForm({ title: b.title ?? "", imageUrl: b.imageUrl, linkUrl: b.linkUrl ?? "", position: b.position, order: b.order, active: b.active }); }} className="p-1.5 text-slate-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(b.id)} className="p-1.5 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
