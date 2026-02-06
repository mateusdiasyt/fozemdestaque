"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { AniversarioForm } from "./AniversarioForm";

interface AniversarioModalProps {
  fullWidth?: boolean;
}

export function AniversarioModal({ fullWidth }: AniversarioModalProps = {}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#ff751f] text-white font-semibold rounded-xl hover:bg-[#e56a1a] transition-colors shadow-lg shadow-[#ff751f]/25 hover:shadow-xl hover:shadow-[#ff751f]/30 ${fullWidth ? "w-full" : ""}`}
      >
        Realizar inscrição
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-semibold text-slate-900">
                Realizar inscrição
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 -m-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <AniversarioForm onClose={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
