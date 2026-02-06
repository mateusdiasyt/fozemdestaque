"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileX, Loader2 } from "lucide-react";
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
          data = parsed ?? { ok: false, error: "Resposta inválida" };
        } catch {
          data = { ok: false, error: res.status >= 500 ? "Erro no servidor. Verifique os logs da Vercel e as variáveis de ambiente (AUTH_SECRET, BLOB_READ_WRITE_TOKEN, DATABASE_URL)." : `Erro ${res.status}` };
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
      setResult({ ok: false, error: err instanceof Error ? err.message : "Erro na importação" });
    } finally {
      setLoading(false);
      setStatus("idle");
      setProgress(null);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <FileX className="w-5 h-5 text-amber-500" />
        Importar do WordPress
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="xml-file" className="block text-sm font-medium text-slate-600 mb-1">
            Arquivo XML (WXR)
          </label>
          <input
            id="xml-file"
            type="file"
            accept=".xml"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFile(f ?? null);
              setResult(null);
            }}
            className="block text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
        </div>
        <button
          type="submit"
          disabled={!file || loading}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {status === "uploading" ? "Enviando arquivo..." : progress ?? "Importando posts..."}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Importar
            </>
          )}
        </button>
      </form>

      {result && (
        <div
          className={`mt-3 p-3 rounded-lg text-sm ${
            result.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {result.ok ? (
            <p>
              Importação concluída: <strong>{result.imported ?? 0}</strong> posts importados
              <span className="block text-xs mt-1 text-amber-700">Imagens mantidas nas URLs originais (evita timeout). Edite os posts para trocar por imagens locais se necessário.</span>
              {typeof result.skipped === "number" && result.skipped > 0 && (
                <>, {result.skipped} ignorados</>
              )}
              {typeof result.categoriesCreated === "number" && result.categoriesCreated > 0 && (
                <> · {result.categoriesCreated} categorias criadas/mapeadas</>
              )}
            </p>
          ) : (
            <p>{result.error ?? "Erro desconhecido"}</p>
          )}
        </div>
      )}
    </div>
  );
}
