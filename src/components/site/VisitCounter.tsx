"use client";

import { useState, useEffect } from "react";
import { Eye } from "lucide-react";

export function VisitCounter() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    const key = "fozemdestaque_visited";
    const visited = typeof window !== "undefined" && sessionStorage.getItem(key);

    fetch(`/api/visits${!visited ? "?inc=1" : ""}`)
      .then((r) => r.json())
      .then((data) => {
        setTotal(data.total ?? 0);
        if (!visited && typeof window !== "undefined") {
          sessionStorage.setItem(key, "1");
        }
      })
      .catch(() => setTotal(0));
  }, []);

  if (total === null) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#000000]/40 backdrop-blur-sm border border-[#ff751f]/30">
      <Eye className="w-4 h-4 text-[#81d303]" strokeWidth={2.5} />
      <span className="text-sm font-semibold text-white">
        Total de visitas:
      </span>
      <span className="text-lg font-bold text-[#ff751f] tabular-nums">
        {total.toLocaleString("pt-BR")}
      </span>
    </div>
  );
}
