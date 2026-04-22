"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Layout, Link2, PanelBottom, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const POSITIONS = [
  {
    value: "header",
    label: "Topo",
    summary: "Slider principal logo abaixo do header. Ideal para campanhas amplas, posicionamento premium e chamadas de grande visibilidade.",
    galleryAspectClass: "aspect-[16/10]",
    previewAspectClass: "aspect-[16/10]",
    previewWidthClass: "max-w-[360px]",
    badge: "Topo",
    formatHint: "Horizontal livre",
    recommendedLimit: null,
  },
  {
    value: "rodape",
    label: "Rodape",
    summary: "Faixa comercial de fechamento da pagina. Funciona melhor com pecas objetivas e leitura mais limpa.",
    galleryAspectClass: "aspect-[16/10]",
    previewAspectClass: "aspect-[16/10]",
    previewWidthClass: "max-w-[360px]",
    badge: "Rodape",
    formatHint: "Horizontal livre",
    recommendedLimit: null,
  },
  {
    value: "lateral_1",
    label: "Lateral esquerda",
    summary: "Coluna fixa da home, posicionada junto ao conteudo central. Pensada para ate 3 banners verticais em 300x600.",
    galleryAspectClass: "aspect-[3/5]",
    previewAspectClass: "aspect-[3/5]",
    previewWidthClass: "max-w-[220px]",
    badge: "Esquerda",
    formatHint: "300x600 recomendado",
    recommendedLimit: 3,
  },
  {
    value: "lateral_2",
    label: "Lateral direita",
    summary: "Coluna fixa da home, espelhando a lateral esquerda. O ideal e manter ate 3 pecas para nao pesar a leitura do portal.",
    galleryAspectClass: "aspect-[3/5]",
    previewAspectClass: "aspect-[3/5]",
    previewWidthClass: "max-w-[220px]",
    badge: "Direita",
    formatHint: "300x600 recomendado",
    recommendedLimit: 3,
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

const DEFAULT_FORM = {
  title: "",
  imageUrl: "",
  linkUrl: "",
  position: "header" as BannerPosition,
  order: 0,
  active: true,
};

function getGridStyle(position: BannerPosition) {
  if (position === "lateral_1" || position === "lateral_2") {
    return {
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 210px))",
      justifyContent: "start",
    } as const;
  }

  return {
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 320px))",
    justifyContent: "start",
  } as const;
}

function simplifyUrl(url: string | null) {
  if (!url) return "Sem link vinculado";

  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export function BannersManager({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BannerPosition>("header");
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMeta = POSITION_META[activeTab];

  const counts = useMemo(() => {
    return POSITIONS.reduce((acc, position) => {
      acc[position.value] = banners.filter((banner) => banner.position === position.value).length;
      return acc;
    }, {} as Record<BannerPosition, number>);
  }, [banners]);

  const filteredBanners = useMemo(
    () => banners.filter((banner) => banner.position === activeTab).sort((a, b) => a.order - b.order),
    [activeTab, banners]
  );

  const activeCount = useMemo(
    () => filteredBanners.filter((banner) => banner.active).length,
    [filteredBanners]
  );

  function resetForm(position: BannerPosition) {
    setForm({
      ...DEFAULT_FORM,
      position,
      order: POSITION_META[position].recommendedLimit ? counts[position] : filteredBanners.length,
    });
  }

  async function handleSave(id?: string) {
    if (!form.imageUrl.trim()) {
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

      if (!res.ok) throw new Error("Nao foi possivel salvar o banner.");

      setEditing(null);
      setCreating(false);
      setForm({ ...DEFAULT_FORM, position: activeTab });
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao salvar banner.");
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
      ...DEFAULT_FORM,
      position: activeTab,
      order: filteredBanners.length,
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const valid = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(file.type);
    if (!valid) {
      alert("Formato invalido. Use JPEG, PNG, WebP ou GIF.");
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
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao enviar imagem.");
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6 text-slate-100">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(165,180,252,0.18),_transparent_28%),linear-gradient(180deg,#0a1020_0%,#060b16_100%)] p-5 shadow-[0_28px_90px_rgba(2,6,23,0.4)] md:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Controle de exibicao</p>
                <h2 className="mt-2 font-headline text-3xl font-semibold tracking-tight text-white">Distribuicao e hierarquia</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Escolha a zona, ajuste a ordem das pecas e mantenha a leitura comercial mais elegante e silenciosa.
                </p>
              </div>

              <button
                onClick={startCreate}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#dfe6ff] px-4 py-2.5 text-sm font-semibold text-[#091122] transition-colors hover:bg-white"
              >
                <Plus className="h-4 w-4" />
                Novo banner
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {POSITIONS.map((position) => {
                const Icon = position.value === "rodape" ? PanelBottom : Layout;
                const isActive = activeTab === position.value;

                return (
                  <button
                    key={position.value}
                    onClick={() => {
                      setActiveTab(position.value);
                      setCreating(false);
                      setEditing(null);
                      setForm((current) => ({ ...current, position: position.value }));
                    }}
                    className={cn(
                      "group rounded-[22px] border px-4 py-4 text-left transition-all",
                      isActive
                        ? "border-[#dfe6ff]/40 bg-[#dfe6ff]/10 shadow-[0_16px_40px_rgba(223,230,255,0.08)]"
                        : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl border",
                        isActive ? "border-[#dfe6ff]/30 bg-[#dfe6ff]/12 text-[#dfe6ff]" : "border-white/10 bg-white/5 text-slate-400"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <span className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        isActive ? "bg-[#dfe6ff] text-[#081120]" : "bg-white/5 text-slate-400"
                      )}>
                        {counts[position.value]}
                      </span>
                    </div>

                    <p className={cn("mt-4 text-sm font-semibold", isActive ? "text-white" : "text-slate-200")}>{position.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{position.formatHint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9)_0%,rgba(8,12,24,0.96)_100%)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Secao ativa</p>
            <h3 className="mt-3 font-headline text-2xl font-semibold text-white">{activeMeta.label}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{activeMeta.summary}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                {activeMeta.formatHint}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                {activeMeta.recommendedLimit ? `Ate ${activeMeta.recommendedLimit} pecas` : "Curadoria livre"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.04] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Cadastrados</p>
            <p className="mt-2 font-headline text-3xl font-semibold text-white">{filteredBanners.length}</p>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.04] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Ativos</p>
            <p className="mt-2 font-headline text-3xl font-semibold text-white">{activeCount}</p>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.04] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Leitura visual</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {activeMeta.recommendedLimit
                ? `Mantemos a home mais limpa com ate ${activeMeta.recommendedLimit} pecas nesta coluna.`
                : "Use poucas pecas por ciclo para preservar uma navegacao mais premium."}
            </p>
          </div>
        </div>
      </section>

      {(creating || editing) && (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#0c1324_0%,#080d18_100%)] p-5 shadow-[0_22px_70px_rgba(2,6,23,0.32)] md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Edicao rapida</p>
                <h3 className="mt-2 font-headline text-2xl font-semibold text-white">
                  {editing ? "Atualizar banner" : "Novo banner"}
                </h3>
              </div>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                {activeMeta.label}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Titulo interno</span>
                <input
                  placeholder="Opcional"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-[#070d18] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-[#dfe6ff]/60"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Link de destino</span>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-[#070d18] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-[#dfe6ff]/60"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ordem</span>
                <input
                  type="number"
                  placeholder="0"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number.parseInt(e.target.value, 10) || 0 })}
                  className="w-full rounded-2xl border border-white/10 bg-[#070d18] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-[#dfe6ff]/60"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#070d18] px-4 py-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-white/20 bg-transparent text-[#dfe6ff] focus:ring-[#dfe6ff]"
                />
                Banner ativo
              </label>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-[#070d18] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Upload</p>
                  <p className="mt-1 text-sm text-slate-400">Use JPG, PNG, WebP ou GIF. O preview ja acompanha a proporcao da secao ativa.</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {activeMeta.formatHint}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
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
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
                    uploadLoading
                      ? "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
                      : "border-[#dfe6ff]/30 bg-[#dfe6ff]/10 text-[#dfe6ff] hover:border-[#dfe6ff] hover:bg-[#dfe6ff]/15"
                  )}
                >
                  <Upload className="h-4 w-4" />
                  {uploadLoading ? "Enviando..." : form.imageUrl ? "Trocar imagem" : "Selecionar imagem"}
                </button>

                {form.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-red-400/30 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover imagem
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => handleSave(editing ?? undefined)}
                disabled={loading}
                className="rounded-full bg-[#dfe6ff] px-5 py-2.5 text-sm font-semibold text-[#091122] transition-colors hover:bg-white disabled:opacity-60"
              >
                {loading ? "Salvando..." : "Salvar banner"}
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                  setForm({ ...DEFAULT_FORM, position: activeTab });
                }}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>

          <aside className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#0c1324_0%,#080d18_100%)] p-5 shadow-[0_22px_70px_rgba(2,6,23,0.32)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Preview</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">Bloco de leitura mais enxuto para mostrar como a peca entra na composicao final.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                {activeMeta.badge}
              </span>
            </div>

            <div className="mt-5 flex justify-center">
              {form.imageUrl ? (
                <div
                  className={cn(
                    "overflow-hidden rounded-[24px] border border-white/10 bg-black/20 shadow-[0_20px_55px_rgba(2,6,23,0.32)]",
                    activeMeta.previewAspectClass,
                    activeMeta.previewWidthClass
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div
                  className={cn(
                    "flex items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] text-slate-500",
                    activeMeta.previewAspectClass,
                    activeMeta.previewWidthClass
                  )}
                >
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-8 w-8 opacity-60" />
                    <p className="mt-3 text-sm">Nenhuma imagem carregada</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-slate-400">
                <Link2 className="h-4 w-4" />
                <span className="truncate">{simplifyUrl(form.linkUrl)}</span>
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{activeMeta.formatHint}</p>
            </div>
          </aside>
        </section>
      )}

      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#0c1324_0%,#080d18_100%)] p-5 shadow-[0_22px_70px_rgba(2,6,23,0.32)] md:p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Acervo visual</p>
            <h3 className="mt-2 font-headline text-2xl font-semibold text-white">Banners cadastrados</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Cards menores, mais controle visual e uma leitura mais proxima do uso real dentro do site.
            </p>
          </div>

          {activeMeta.recommendedLimit && filteredBanners.length > activeMeta.recommendedLimit && (
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
              Acima do recomendado para esta lateral
            </span>
          )}
        </div>

        {filteredBanners.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-14 text-center text-slate-400">
            Nenhuma peca cadastrada nesta secao ainda.
          </div>
        ) : (
          <div className="grid gap-4" style={getGridStyle(activeTab)}>
            {filteredBanners.map((banner) => {
              const bannerMeta = POSITION_META[banner.position as BannerPosition] ?? activeMeta;

              return (
                <article
                  key={banner.id}
                  className="group overflow-hidden rounded-[24px] border border-white/10 bg-[#070d18] shadow-[0_18px_45px_rgba(2,6,23,0.28)] transition-all hover:-translate-y-0.5 hover:border-white/15"
                >
                  <div className={cn("relative overflow-hidden bg-black/20", bannerMeta.galleryAspectClass)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={banner.imageUrl}
                      alt={banner.title ?? "Banner"}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        {bannerMeta.badge}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                        #{banner.order}
                      </span>
                    </div>

                    <div>
                      <p className="truncate text-sm font-semibold text-white">{banner.title || "Banner sem titulo"}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{simplifyUrl(banner.linkUrl)}</p>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                          banner.active ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-slate-500"
                        )}
                      >
                        {banner.active ? "Ativo" : "Inativo"}
                      </span>

                      <div className="flex items-center gap-2">
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
                          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-red-400/10 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
