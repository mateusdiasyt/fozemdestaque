"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { Check, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  postId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  approved: boolean;
  createdAt: Date;
}

export function CommentsManager({ comments }: { comments: Comment[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const filtered = filter === "pending" ? comments.filter((c) => !c.approved) : filter === "approved" ? comments.filter((c) => c.approved) : comments;

  async function handleApprove(id: string, approved: boolean) {
    const res = await fetch(`/api/admin/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    if (res.ok) router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este comentário?")) return;
    const res = await fetch(`/api/admin/comments/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["all", "pending", "approved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-lg",
              filter === f ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            )}
          >
            {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : "Aprovados"}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {filtered.map((c) => (
          <div key={c.id} className="p-4 flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{c.authorName}</span>
                <span className="text-slate-500 text-sm">{c.authorEmail}</span>
                <span className={cn("px-2 py-0.5 rounded text-xs", c.approved ? "bg-green-200" : "bg-amber-200")}>
                  {c.approved ? "Aprovado" : "Pendente"}
                </span>
              </div>
              <p className="text-slate-700">{c.content}</p>
              <p className="text-xs text-slate-400 mt-1">
                {format(new Date(c.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })} · Post ID: {c.postId}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {!c.approved && (
                <button onClick={() => handleApprove(c.id, true)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Aprovar">
                  <Check className="w-4 h-4" />
                </button>
              )}
              {c.approved && (
                <button onClick={() => handleApprove(c.id, false)} className="p-2 text-amber-600 hover:bg-amber-50 rounded" title="Rejeitar">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => handleDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Remover">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
