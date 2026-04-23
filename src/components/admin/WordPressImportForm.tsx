"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileX, Loader2, Upload } from "lucide-react";
import { upload } from "@vercel/blob/client";

export function WordPressImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "importing">("idle");
  const [result, setResult] = useState<{ ok: boolean; imported?: number; skipped?: number; total?: number; categoriesCreated?: number; error?: string } | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    setProgress(null);
    try {
      setStatus("uploading");
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/wordpress-import/upload",
        multipart: file.size > 10 * 1024 * 1024,
      });
      setStatus("importing");
      let totalImported = 0;
      let totalSkipped = 0;
      let offset = 0;
      const limit = 2;
      let hasMore = true;
      let categoriesCreated = 0;
      let total = 0;

      while (hasMore) {
        setProgress(total > 0 ? `Importando... ${totalImported}/${total} posts` : totalImported > 0 ? `Importando... ${totalImported} posts` : "Importando...");
        const res = await fetch("/api/wordpress-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: blob.url, offset, limit, skipImages: true }),
        });
        let data: { ok: boolean; imported?: number; skipped?: number; total?: number; hasMore?: boolean; nextOffset?: number; categoriesCreated?: number; error?: string };
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          data = parsed ?? { ok: false, error: "Resposta invalida" };
        } catch {
          data = { ok: false, error: res.status >= 500 ? "Erro no servidor. Verifique os logs da Vercel e as variaveis de ambiente." : `Erro ${res.status}` };
        }
        if (!data.ok) {
          setResult({ ok: false, error: data.error ?? `Erro ${res.status}` });
          break;
        }
        totalImported += data.imported ?? 0;
        totalSkipped += data.skipped ?? 0;
        total = data.total ?? total;
        categoriesCreated = data.categoriesCreated ?? categoriesCreated;
        hasMore = !!data.hasMore;
        offset = data.nextOffset ?? offset + limit;
      }

      if (hasMore === false) {
        setResult({ ok: true, imported: totalImported, skipped: totalSkipped, categoriesCreated });
        router.refresh();
      }
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Erro na importacao" });
    } finally {
      setLoading(false);
      setStatus("idle");
      setProgress(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#0c1324_0%,#080d18_100%)] p-5 shadow-[0_22px_70px_rgba(2,6,23,0.32)] md:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dfe6ff]/20 bg-[#dfe6ff]/10 text-[#dfe6ff]">
              <FileX className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Importador</p>
              <h2 className="font-headline text-2xl font-semibold tracking-tight text-white">WordPress WXR</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Envie o XML quando precisar trazer conteudos antigos. As imagens continuam por URL para evitar timeout.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-[minmax(220px,1fr)_auto] xl:min-w-[520px]">
          <label htmlFor="xml-file" className="group cursor-pointer rounded-[18px] border border-white/10 bg-[#070d18] px-4 py-3 transition-colors hover:border-[#dfe6ff]/40">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Arquivo XML</span>
            <span className="mt-1 block truncate text-sm font-medium text-slate-200">
              {file ? file.name : "Selecionar arquivo .xml"}
            </span>
            <input
              id="xml-file"
              type="file"
              accept=".xml"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFile(f ?? null);
                setResult(null);
              }}
              className="sr-only"
            />
          </label>

          <button
            type="submit"
            disabled={!file || loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#dfe6ff] px-5 py-3 text-sm font-semibold text-[#091122] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {status === "uploading" ? "Enviando..." : progress ?? "Importando..."}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importar
              </>
            )}
          </button>
        </form>
      </div>

      {result && (
        <div
          className={`mt-5 rounded-[22px] border px-4 py-3 text-sm ${
            result.ok
              ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
              : "border-red-300/20 bg-red-300/10 text-red-200"
          }`}
        >
          {result.ok ? (
            <p>
              Importacao concluida: <strong>{result.imported ?? 0}</strong> posts importados
              <span className="mt-1 block text-xs text-emerald-200/80">Imagens mantidas nas URLs originais. Edite posts especificos para trocar por imagens locais quando necessario.</span>
              {typeof result.skipped === "number" && result.skipped > 0 && <span>, {result.skipped} ignorados</span>}
              {typeof result.categoriesCreated === "number" && result.categoriesCreated > 0 && <span> - {result.categoriesCreated} categorias criadas/mapeadas</span>}
            </p>
          ) : (
            <p>{result.error ?? "Erro desconhecido"}</p>
          )}
        </div>
      )}
    </section>
  );
}
