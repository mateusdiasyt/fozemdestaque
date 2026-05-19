"use client";

import { useEffect, useState } from "react";
import { Globe2, ImagePlus, Loader2, Save, Sparkles } from "lucide-react";

type CustomizationState = {
  pageTitle: string;
  faviconUrl: string;
};

const DEFAULT_STATE: CustomizationState = {
  pageTitle: "Foz em Destaque",
  faviconUrl: "",
};

export function CustomizationManager() {
  const [form, setForm] = useState<CustomizationState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/customization");
        const data = (await res.json()) as Partial<CustomizationState>;
        if (!active) return;

        if (res.ok) {
          setForm({
            pageTitle: data.pageTitle || DEFAULT_STATE.pageTitle,
            faviconUrl: data.faviconUrl || "",
          });
        }
      } catch {
        if (active) setError("Nao foi possivel carregar a personalizacao.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      active = false;
    };
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("kind", "image");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: payload,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Nao foi possivel enviar o favicon.");
      }

      setForm((current) => ({ ...current, faviconUrl: data.url ?? "" }));
      setMessage("Favicon enviado. Salve para aplicar no site.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar favicon.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/customization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Nao foi possivel salvar.");
      }
      setMessage("Personalizacao atualizada. Pode levar ate 1 minuto para refletir na aba.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
        Carregando personalizacao...
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
              Personalizado
            </p>
            <h1 className="text-2xl font-semibold text-white">Aba do navegador</h1>
          </div>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">
              Nome das paginas
            </span>
            <input
              value={form.pageTitle}
              onChange={(event) =>
                setForm((current) => ({ ...current, pageTitle: event.target.value }))
              }
              maxLength={80}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
              placeholder="Foz em Destaque"
            />
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-200">Favicon</span>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={form.faviconUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, faviconUrl: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
                placeholder="https://..."
              />
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                Enviar
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleUpload(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alteracoes
            </button>
            {message && <span className="text-sm text-emerald-300">{message}</span>}
            {error && <span className="text-sm text-rose-300">{error}</span>}
          </div>
        </div>
      </section>

      <aside className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-300">
            <Globe2 className="h-5 w-5" />
          </span>
          <h2 className="font-semibold text-white">Previa</h2>
        </div>
        <div className="rounded-t-xl border border-slate-700 bg-slate-950 px-3 py-2">
          <div className="inline-flex max-w-full items-center gap-2 rounded-t-lg bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-slate-950">
              {form.faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.faviconUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold">F</span>
              )}
            </span>
            <span className="max-w-[230px] truncate">{form.pageTitle || DEFAULT_STATE.pageTitle}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
