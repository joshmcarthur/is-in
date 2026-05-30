const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidDestinationEmail(email: string): boolean {
  const e = email.trim();
  if (e.length > 254) return false;
  return EMAIL_RE.test(e);
}

export function isSafeForwardUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return false;
  if (host.endsWith(".local")) return false;
  return true;
}
