export function normalizeDatabaseUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  const schemeIndex = trimmed.indexOf("://");

  if (schemeIndex === -1) return trimmed;

  const scheme = trimmed.slice(0, schemeIndex + 3);
  const rest = trimmed.slice(schemeIndex + 3);
  const atIndex = rest.lastIndexOf("@");

  if (atIndex === -1) return trimmed;

  const auth = rest.slice(0, atIndex);
  const hostAndPath = rest.slice(atIndex + 1);
  const colonIndex = auth.indexOf(":");

  if (colonIndex === -1) return trimmed;

  const username = auth.slice(0, colonIndex);
  const password = auth.slice(colonIndex + 1);

  return `${scheme}${encodeCredential(username)}:${encodeCredential(password)}@${hostAndPath}`;
}

function encodeCredential(value: string) {
  const decoded = safelyDecodeURIComponent(value);
  return encodeURIComponent(decoded);
}

function safelyDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
