"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

const PIX_KEY = "04.276.794/0001-71";
const PIX_KEY_RAW = "04276794000171";
const BANK_DETAILS = `Banco: SICOOB Cooperativa de Crédito Três Fronteiras (756)
Correntista: Marco Antonio Freire ME
CNPJ: 04.276.794/0001-71
Conta Corrente: 5.015-6
Agência: 4343-5 (Foz do Iguaçu - PR)`;

export function TaxaAdesaoSection() {
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  async function copyPix() {
    try {
      await navigator.clipboard.writeText(PIX_KEY_RAW);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    } catch {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    }
  }

  async function copyBank() {
    try {
      await navigator.clipboard.writeText(BANK_DETAILS);
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* PIX Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">PIX (Chave CNPJ)</h3>
          <button
            type="button"
            onClick={copyPix}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ff751f]/10 text-[#ff751f] hover:bg-[#ff751f]/20 transition-colors text-sm font-medium"
          >
            {copiedPix ? (
              <>
                <Check className="w-4 h-4" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar chave
              </>
            )}
          </button>
        </div>
        <p className="font-mono text-slate-700 bg-slate-50 rounded-lg px-4 py-3 text-sm break-all">
          {PIX_KEY}
        </p>
      </div>

      {/* Transferência Bancária Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Transferência Bancária</h3>
          <button
            type="button"
            onClick={copyBank}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ff751f]/10 text-[#ff751f] hover:bg-[#ff751f]/20 transition-colors text-sm font-medium"
          >
            {copiedBank ? (
              <>
                <Check className="w-4 h-4" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar dados
              </>
            )}
          </button>
        </div>
        <ul className="space-y-2 text-slate-600 text-sm">
          <li><strong className="text-slate-700">Banco:</strong> SICOOB Cooperativa de Crédito Três Fronteiras (756)</li>
          <li><strong className="text-slate-700">Correntista:</strong> Marco Antonio Freire ME</li>
          <li><strong className="text-slate-700">CNPJ:</strong> 04.276.794/0001-71</li>
          <li><strong className="text-slate-700">Conta:</strong> 5.015-6</li>
          <li><strong className="text-slate-700">Agência:</strong> 4343-5 (Foz do Iguaçu - PR)</li>
        </ul>
      </div>
    </div>
  );
}
