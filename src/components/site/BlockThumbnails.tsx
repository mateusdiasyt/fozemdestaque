"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteImage } from "@/components/site/SiteImage";

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

  const block = blocks[0];
  const href = block.link || (block.slug ? `/${block.slug}` : "#");

  return (
    <Link href={href} className="group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-white/10">
      {block.thumbnail && (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-[#4e5b60] ring-1 ring-white/20">
          <SiteImage
            src={block.thumbnail}
            alt=""
            className="h-full w-full object-cover"
            fallback={<div className="h-full w-full bg-[#4e5b60]" />}
          />
        </div>
      )}
      <div>
        <span className="block text-xs text-[#859eac]">{typeLabels[type] ?? type}</span>
        <span className="font-medium text-white group-hover:text-[#81d303]">{block.title}</span>
      </div>
    </Link>
  );
}
