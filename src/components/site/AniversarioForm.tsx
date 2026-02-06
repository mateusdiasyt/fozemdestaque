"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AniversarioForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      nomeCompleto: fd.get("nomeCompleto") as string,
      cpfRucCuit: fd.get("cpfRucCuit") as string,
      documentoIdentidade: (fd.get("documentoIdentidade") as string) || undefined,
      dataNascimento: fd.get("dataNascimento") as string,
      cidadeNascimento: (fd.get("cidadeNascimento") as string) || undefined,
      cidadeReside: fd.get("cidadeReside") as string,
      nomeSocial: fd.get("nomeSocial") as string,
      foneContato: (fd.get("foneContato") as string) || undefined,
      email: fd.get("email") as string,
      profissao: fd.get("profissao") as string,
      empresaAtual: fd.get("empresaAtual") as string,
      cargo: (fd.get("cargo") as string) || undefined,
      instagram: fd.get("instagram") as string,
      facebook: fd.get("facebook") as string,
      instagramProfissional: (fd.get("instagramProfissional") as string) || undefined,
      estadoCivil: fd.get("estadoCivil") as string,
      nomeConjuge: (fd.get("nomeConjuge") as string) || undefined,
      dataCasamento: (fd.get("dataCasamento") as string) || null,
      outrasInformacoes: (fd.get("outrasInformacoes") as string) || undefined,
      autorizaPublicacao: fd.get("autorizaPublicacao") === "sim",
    };

    try {
      const res = await fetch("/api/aniversarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar");
      setSuccess(true);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <p className="text-green-800 font-medium text-lg">Inscrição enviada com sucesso!</p>
        <p className="text-green-700 text-sm mt-2">
          Em breve entraremos em contato. Não esqueça de realizar a taxa de adesão de R$ 28/ano.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Enviar outra inscrição
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-2.5 border border-[#e8ebed] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff751f]/50 focus:border-[#ff751f] text-[#4e5b60]";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">Nome completo *</label>
          <input name="nomeCompleto" required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">CPF / RUC / CUIT *</label>
          <input name="cpfRucCuit" required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">
            Documento identidade / Órgão emissor
          </label>
          <input name="documentoIdentidade" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">Data de nascimento *</label>
          <input name="dataNascimento" type="date" required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">
            Cidade/Estado/País de nascimento
          </label>
          <input name="cidadeNascimento" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">
            Cidade onde reside *
          </label>
          <input name="cidadeReside" required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">
            Nome social (que irá aparecer na homenagem) *
          </label>
          <input name="nomeSocial" required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">Fone contato</label>
          <input name="foneContato" type="tel" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">Email *</label>
          <input name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">Profissão *</label>
          <input name="profissao" required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">
            Empresa na qual atua *
          </label>
          <input name="empresaAtual" required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">Cargo</label>
          <input name="cargo" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">
            Redes sociais - Instagram *
          </label>
          <input name="instagram" required className={inputClass} placeholder="@usuario" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">
            Redes sociais - Facebook *
          </label>
          <input name="facebook" required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">
            Redes sociais - Instagram profissional
          </label>
          <input name="instagramProfissional" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">Estado civil *</label>
          <select name="estadoCivil" required className={inputClass}>
            <option value="">Selecione</option>
            <option value="casado">Casado(a)</option>
            <option value="solteiro">Solteiro(a)</option>
            <option value="divorciado">Divorciado(a)</option>
            <option value="viuvo">Viúvo(a)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">Nome do cônjuge</label>
          <input name="nomeConjuge" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4e5b60] mb-1">Data do casamento</label>
          <input name="dataCasamento" type="date" className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#4e5b60] mb-1">
          Outras informações (opcional)
        </label>
        <textarea
          name="outrasInformacoes"
          rows={3}
          className={inputClass}
          placeholder="Informações adicionais..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#4e5b60] mb-2">
          Autorizo a publicação da homenagem em meu aniversário *
        </label>
        <select name="autorizaPublicacao" required className={inputClass + " max-w-xs"}>
          <option value="sim">SIM</option>
        </select>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-[#ff751f] text-white font-medium rounded-lg hover:bg-[#e56a1a] disabled:opacity-70"
        >
          {loading ? "Enviando..." : "Enviar inscrição"}
        </button>
      </div>
    </form>
  );
}
