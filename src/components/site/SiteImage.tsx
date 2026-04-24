"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { normalizeMediaUrl } from "@/lib/media";

interface SiteImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  fallback?: ReactNode;
}

export function SiteImage({
  src,
  alt,
  className,
  loading = "lazy",
  fallback = null,
}: SiteImageProps) {
  const normalizedSrc = useMemo(() => normalizeMediaUrl(src), [src]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [normalizedSrc]);

  if (!normalizedSrc || failed) {
    return <>{fallback}</>;
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={normalizedSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
