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
    <div className="p-6 md:p-8 border-t border-[#e8ebed]">
      <h3 className="text-lg font-bold text-[#000000] mb-4">Comentários ({comments.length})</h3>
      {submitted && (
        <p className="text-[#81d303] text-sm mb-4">
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
            className="px-3 py-2 border border-[#859eac] rounded-lg focus:ring-2 focus:ring-[#ff751f] focus:border-[#ff751f] outline-none"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-3 py-2 border border-[#859eac] rounded-lg focus:ring-2 focus:ring-[#ff751f] focus:border-[#ff751f] outline-none"
          />
        </div>
        <textarea
          placeholder="Seu comentário"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          minLength={5}
          rows={4}
          className="w-full px-3 py-2 border border-[#859eac] rounded-lg focus:ring-2 focus:ring-[#ff751f] focus:border-[#ff751f] outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[#ff751f] text-white rounded-lg hover:bg-[#e56a1a] disabled:opacity-50 font-medium"
        >
          {loading ? "Enviando..." : "Enviar comentário"}
        </button>
      </form>
      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="py-3 border-b border-[#e8ebed] last:border-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-[#4e5b60]">{c.authorName}</span>
              <span className="text-[#859eac] text-sm">
                {new Date(c.createdAt).toLocaleDateString("pt-BR", { dateStyle: "short" })}
              </span>
            </div>
            <p className="text-[#4e5b60]">{c.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
