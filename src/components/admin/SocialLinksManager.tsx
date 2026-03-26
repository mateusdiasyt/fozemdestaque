"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import {
  mergeSocialLinks,
  normalizeSocialUrl,
  type SocialLinkState,
  type SocialPlatform,
} from "@/lib/social-links";

interface AdminLinksResponse {
  links: SocialLinkState[];
}

export function SocialLinksManager() {
  const [links, setLinks] = useState<SocialLinkState[]>(mergeSocialLinks([]));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/social-links");
        const data = (await res.json()) as AdminLinksResponse;
        if (!active) return;
        if (res.ok && Array.isArray(data.links)) {
          setLinks(data.links);
        }
      } catch {
        // Mantém defaults
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  function updateLink(
    platform: SocialPlatform,
    field: "value" | "active",
    value: string | boolean
  ) {
    setLinks((prev) =>
      prev.map((item) =>
        item.platform === platform ? { ...item, [field]: value } : item
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        links: links.map((item, index) => ({
          platform: item.platform,
          value: item.value,
          active: item.active,
          order: index,
        })),
      };
      const res = await fetch("/api/admin/social-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar.");
        return;
      }
      setMessage("Redes sociais atualizadas com sucesso.");
    } catch {
      setError("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const orderedLinks = useMemo(() => links.slice().sort((a, b) => a.order - b.order), [links]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-800">Redes Sociais</h2>
        <p className="text-sm text-slate-500 mt-1">
          Preencha com URL completa ou com @usuario. Exemplo: <code>@fozemdestaque</code>.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Carregando...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {orderedLinks.map((item) => {
              const preview = normalizeSocialUrl(item.platform, item.value);
              return (
                <div key={item.platform} className="p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-slate-800">{item.label}</h3>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) =>
                          updateLink(item.platform, "active", e.target.checked)
                        }
                      />
                      Ativo
                    </label>
                  </div>

                  <input
                    type="text"
                    value={item.value}
                    onChange={(e) =>
                      updateLink(item.platform, "value", e.target.value)
                    }
                    placeholder={item.placeholder}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <p className="text-xs text-slate-500 mt-2">
                    Pré-visualização:{" "}
                    {preview ? (
                      <a
                        href={preview}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {preview}
                      </a>
                    ) : (
                      <span className="text-slate-400">link inválido</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-slate-200 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar alterações
            </button>
            {message && <span className="text-sm text-emerald-600">{message}</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

