"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Layout, PanelBottom, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const POSITIONS = [
  {
    value: "header",
    label: "Banners do Topo",
    summary: "Slider principal entre o header e o portal. A ordem define a sequência.",
    aspectClass: "aspect-video",
    previewClass: "max-w-xs",
    badge: "Topo (slider)",
  },
  {
    value: "rodape",
    label: "Banners do Rodapé",
    summary: "Faixa publicitária do rodapé. Exibida em grupos de 3 banners.",
    aspectClass: "aspect-video",
    previewClass: "max-w-xs",
    badge: "Rodapé",
  },
  {
    value: "lateral_1",
    label: "Laterais Esquerda",
    summary: "Coluna publicitária esquerda da home. Recomendado: 300x600. Exibe até 3 peças na ordem cadastrada.",
    aspectClass: "aspect-[300/600]",
    previewClass: "max-w-[220px]",
    badge: "Lateral esquerda",
  },
  {
    value: "lateral_2",
    label: "Laterais Direita",
    summary: "Coluna publicitária direita da home. Recomendado: 300x600. Exibe até 3 peças na ordem cadastrada.",
    aspectClass: "aspect-[300/600]",
    previewClass: "max-w-[220px]",
    badge: "Lateral direita",
  },
] as const;

type BannerPosition = (typeof POSITIONS)[number]["value"];

const POSITION_META = Object.fromEntries(POSITIONS.map((position) => [position.value, position])) as Record<
  BannerPosition,
  (typeof POSITIONS)[number]
>;

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
  const [activeTab, setActiveTab] = useState<BannerPosition>("header");
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    imageUrl: "",
    linkUrl: "",
    position: "header" as BannerPosition,
    order: 0,
    active: true,
  });
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMeta = POSITION_META[activeTab];
  const filteredBanners = useMemo(
    () => banners.filter((banner) => banner.position === activeTab).sort((a, b) => a.order - b.order),
    [activeTab, banners]
  );

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
    setEditing(null);
    setForm({
      title: "",
      imageUrl: "",
      linkUrl: "",
      position: activeTab,
      order: filteredBanners.length,
      active: true,
    });
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
      setForm((current) => ({ ...current, imageUrl: data.url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {POSITIONS.map((position) => {
          const Icon = position.value === "rodape" ? PanelBottom : Layout;
          return (
            <button
              key={position.value}
              onClick={() => {
                setActiveTab(position.value);
                setCreating(false);
                setEditing(null);
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors",
                activeTab === position.value
                  ? "bg-[#ff751f] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Icon className="h-4 w-4" />
              {position.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500">{activeMeta.summary}</p>
          {(activeTab === "lateral_1" || activeTab === "lateral_2") && (
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[#ff751f]">
              Formato recomendado: 300x600
            </p>
          )}
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#ff751f] px-4 py-2 text-white hover:bg-[#e56a1a]"
        >
          <Plus className="h-4 w-4" />
          Novo Banner
        </button>
      </div>

      {(creating || editing) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-medium">{editing ? "Editar" : "Novo"} banner — {activeMeta.badge}</h3>
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              placeholder="Título (opcional)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-lg border px-3 py-2"
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-600">Imagem (JPEG, PNG, WebP ou GIF) *</label>
              <div className="flex items-center gap-2">
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
                    "flex items-center gap-2 rounded-lg border-2 border-dashed px-4 py-2 transition-colors",
                    uploadLoading
                      ? "cursor-not-allowed border-slate-200 bg-slate-50"
                      : "border-[#ff751f]/50 hover:border-[#ff751f] hover:bg-orange-50"
                  )}
                >
                  {uploadLoading ? (
                    <>Enviando...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-[#ff751f]" />
                      {form.imageUrl ? "Trocar imagem" : "Escolher arquivo"}
                    </>
                  )}
                </button>
                {form.imageUrl && (
                  <div className="flex min-w-0 items-center gap-2">
                    <ImageIcon className="h-5 w-5 shrink-0 text-green-600" />
                    <span className="truncate text-sm text-slate-600">Imagem selecionada</span>
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}
                      className="shrink-0 text-sm text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
              {form.imageUrl && (
                <div className={cn("mt-2 overflow-hidden rounded-lg bg-slate-100", activeMeta.aspectClass, activeMeta.previewClass)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            <input
              type="url"
              placeholder="Link ao clicar (opcional)"
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              className="rounded-lg border px-3 py-2"
            />
            <input
              type="number"
              placeholder="Ordem"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number.parseInt(e.target.value, 10) || 0 })}
              className="rounded-lg border px-3 py-2"
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Ativo
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSave(editing ?? undefined)}
              disabled={loading}
              className="rounded-lg bg-[#ff751f] px-4 py-2 text-white hover:bg-[#e56a1a]"
            >
              Salvar
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
              className="rounded-lg border px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className={cn("grid gap-4", activeTab === "header" || activeTab === "rodape" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3")}>
        {filteredBanners.map((banner) => (
          <div key={banner.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className={cn("relative bg-slate-100", POSITION_META[banner.position as BannerPosition]?.aspectClass ?? "aspect-video")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={banner.imageUrl} alt={banner.title ?? ""} className="h-full w-full object-cover" />
              <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                {POSITION_META[banner.position as BannerPosition]?.badge ?? banner.position}
              </span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className={cn("rounded px-2 py-0.5 text-xs", banner.active ? "bg-green-200 text-green-800" : "bg-slate-200 text-slate-600")}>
                {banner.active ? "Ativo" : "Inativo"}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(banner.id);
                    setCreating(false);
                    setForm({
                      title: banner.title ?? "",
                      imageUrl: banner.imageUrl,
                      linkUrl: banner.linkUrl ?? "",
                      position: banner.position as BannerPosition,
                      order: banner.order,
                      active: banner.active,
                    });
                    setActiveTab(banner.position as BannerPosition);
                  }}
                  className="p-1.5 text-slate-500 hover:text-[#ff751f]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(banner.id)} className="p-1.5 text-slate-500 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
