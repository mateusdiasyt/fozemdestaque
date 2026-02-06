"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileXml, Loader2 } from "lucide-react";

export function WordPressImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; imported?: number; skipped?: number; categoriesCreated?: number; error?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/import/wordpress", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
      if (data.ok) {
        router.refresh();
      }
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Erro na importação" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <FileXml className="w-5 h-5 text-amber-500" />
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
              Importando...
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
