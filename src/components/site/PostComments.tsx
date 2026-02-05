"use client";

import { useState, useEffect } from "react";

interface Comment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export function PostComments({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?postId=${postId}`)
      .then((r) => r.json())
      .then(setComments)
      .catch(() => {});
  }, [postId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, authorName: name, authorEmail: email, content }),
      });
      if (res.ok) {
        setSubmitted(true);
        setName("");
        setEmail("");
        setContent("");
      } else {
        const err = await res.json();
        alert(err?.error ?? "Erro ao enviar comentário");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-8 border-t border-slate-200">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Comentários ({comments.length})</h3>
      {submitted && (
        <p className="text-green-600 text-sm mb-4">
          Comentário enviado! Ele será exibido após aprovação da moderação.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="px-3 py-2 border border-slate-300 rounded-lg"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <textarea
          placeholder="Seu comentário"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          minLength={5}
          rows={4}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar comentário"}
        </button>
      </form>
      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="py-3 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-slate-800">{c.authorName}</span>
              <span className="text-slate-400 text-sm">
                {new Date(c.createdAt).toLocaleDateString("pt-BR", { dateStyle: "short" })}
              </span>
            </div>
            <p className="text-slate-600">{c.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
