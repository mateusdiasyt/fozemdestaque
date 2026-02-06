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
    <div className="flex items-center gap-2 text-sm">
      <Eye className="w-4 h-4 text-[#81d303]" strokeWidth={2} />
      <span className="text-[#859eac]">Visitas</span>
      <span className="font-semibold text-white tabular-nums">
        {total.toLocaleString("pt-BR")}
      </span>
    </div>
  );
}
