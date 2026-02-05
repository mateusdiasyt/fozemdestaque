"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Block {
  id: string;
  type: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  thumbnail: string | null;
  link: string | null;
}

const typeLabels: Record<string, string> = {
  aniversario: "Aniversários",
  data: "Datas",
  reflexao: "Reflexão",
};

export function BlockThumbnails({ type, limit = 1 }: { type: string; limit?: number }) {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    fetch(`/api/blocks?type=${type}&limit=${limit}`)
      .then((r) => r.json())
      .then(setBlocks)
      .catch(() => {});
  }, [type, limit]);

  if (blocks.length === 0) return null;

  const b = blocks[0];
  const href = b.link || (b.slug ? `/${b.slug}` : "#");
  return (
    <Link href={href} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors group">
      {b.thumbnail && (
        <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.thumbnail} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div>
        <span className="text-xs text-slate-500 block">{typeLabels[type] ?? type}</span>
        <span className="font-medium text-slate-800 group-hover:text-blue-600">{b.title}</span>
      </div>
    </Link>
  );
}
