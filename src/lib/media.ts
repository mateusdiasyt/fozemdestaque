export function normalizeMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim().replace(/&amp;/gi, "&");
  if (!trimmed) return null;

  if (trimmed.startsWith("/wp-content/")) {
    return `https://fozemdestaque.com${trimmed}`;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);

      if (
        url.hostname === "www.fozemdestaque.com" &&
        url.pathname.startsWith("/wp-content/")
      ) {
        url.hostname = "fozemdestaque.com";
      }

      if (url.protocol === "http:") {
        url.protocol = "https:";
      }

      return url.toString();
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export function enhanceContentHtml(html: string): string {
  let output = html;

  output = output.replace(
    /(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
    (_match, start: string, src: string, end: string) => {
      const normalized = normalizeMediaUrl(src) ?? src;
      return `${start}${normalized}${end}`;
    }
  );

  output = output.replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy"');
  output = output.replace(/<img\b(?![^>]*\bdecoding=)/gi, '<img decoding="async"');
  output = output.replace(
    /<img\b(?![^>]*\breferrerpolicy=)/gi,
    '<img referrerpolicy="no-referrer"'
  );

  return output;
}
