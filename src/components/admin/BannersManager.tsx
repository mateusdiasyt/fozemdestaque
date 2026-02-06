"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Layout, PanelBottom, Upload, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const POSITIONS = [
  { value: "header", label: "Topo (Slider)", icon: Layout },
  { value: "rodape", label: "Rodapé", icon: PanelBottom },
  { value: "lateral_1", label: "Lateral 1", icon: Layout },
  { value: "lateral_2", label: "Lateral 2", icon: Layout },
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
  const [activeTab, setActiveTab] = useState<"header" | "rodape">("header");
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", imageUrl: "", linkUrl: "", position: "header" as string, order: 0, active: true });
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredBanners = banners.filter((b) => b.position === activeTab);

  async function handleSave(id?: string) {
    if (!form.imageUrl?.trim()) {
      alert("Envie uma imagem antes de salvar.");
      return;
    }
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
        setForm({ title: "", imageUrl: "", linkUrl: "", position: activeTab, order: 0, active: true });
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

  function startCreate() {
    setCreating(true);
    setForm({ title: "", imageUrl: "", linkUrl: "", position: activeTab, order: filteredBanners.length, active: true });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(file.type);
    if (!valid) {
      alert("Formato inválido. Use JPEG, PNG, WebP ou GIF.");
      return;
    }
    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no upload");
      setForm((f) => ({ ...f, imageUrl: data.url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-200 pb-4">
        <button
          onClick={() => { setActiveTab("header"); setCreating(false); setEditing(null); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
            activeTab === "header" ? "bg-[#ff751f] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <Layout className="w-4 h-4" />
          Banners do Topo
        </button>
        <button
          onClick={() => { setActiveTab("rodape"); setCreating(false); setEditing(null); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
            activeTab === "rodape" ? "bg-[#ff751f] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <PanelBottom className="w-4 h-4" />
          Banners do Rodapé
        </button>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {activeTab === "header"
            ? "Slider entre o header e o conteúdo. Ordem define a sequência."
            : "Grid de 6 banners no rodapé. Ordem define a posição."}
        </p>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#ff751f] text-white rounded-lg hover:bg-[#e56a1a]"
        >
          <Plus className="w-4 h-4" />
          Novo Banner
        </button>
      </div>

      {(creating || editing) && (
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <h3 className="font-medium mb-3">{editing ? "Editar" : "Novo"} banner — {activeTab === "header" ? "Topo" : "Rodapé"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input placeholder="Título (opcional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="px-3 py-2 border rounded-lg" />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-600">Imagem (JPEG, PNG, WebP ou GIF) *</label>
              <div className="flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLoading}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-colors",
                    uploadLoading ? "border-slate-200 bg-slate-50 cursor-not-allowed" : "border-[#ff751f]/50 hover:border-[#ff751f] hover:bg-orange-50"
                  )}
                >
                  {uploadLoading ? (
                    <>Enviando...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-[#ff751f]" />
                      {form.imageUrl ? "Trocar imagem" : "Escolher arquivo"}
                    </>
                  )}
                </button>
                {form.imageUrl && (
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon className="w-5 h-5 text-green-600 shrink-0" />
                    <span className="text-sm text-slate-600 truncate">Imagem selecionada</span>
                    <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))} className="text-red-600 hover:underline text-sm shrink-0">Remover</button>
                  </div>
                )}
              </div>
              {form.imageUrl && (
                <div className="mt-2 aspect-video max-w-xs bg-slate-100 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <input type="url" placeholder="Link ao clicar (opcional)" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} className="px-3 py-2 border rounded-lg" />
            <input type="number" placeholder="Ordem" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value, 10) || 0 })} className="px-3 py-2 border rounded-lg" />
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo</label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSave(editing ?? undefined)} disabled={loading} className="px-4 py-2 bg-[#ff751f] text-white rounded-lg hover:bg-[#e56a1a]">Salvar</button>
            <button onClick={() => { setCreating(false); setEditing(null); }} className="px-4 py-2 border rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBanners.map((b) => (
          <div key={b.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="aspect-video bg-slate-100 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt={b.title ?? ""} className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                {POSITIONS.find((p) => p.value === b.position)?.label ?? b.position}
              </span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <span className={cn("text-xs px-2 py-0.5 rounded", b.active ? "bg-green-200 text-green-800" : "bg-slate-200 text-slate-600")}>{b.active ? "Ativo" : "Inativo"}</span>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(b.id); setCreating(false); setForm({ title: b.title ?? "", imageUrl: b.imageUrl, linkUrl: b.linkUrl ?? "", position: b.position, order: b.order, active: b.active }); }} className="p-1.5 text-slate-500 hover:text-[#ff751f]"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(b.id)} className="p-1.5 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
