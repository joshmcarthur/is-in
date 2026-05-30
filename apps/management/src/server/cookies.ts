const SESSION_COOKIE = "isin_session";

export function getCookie(request: Request, name: string): string | undefined {
  const h = request.headers.get("cookie");
  if (!h) return undefined;
  for (const part of h.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

function isLocalHost(host: string): boolean {
  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

export function appendSessionCookie(headers: Headers, sid: string, host: string, maxAge: number): void {
  const localDev = isLocalHost(host);
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(sid)}`,
    "Path=/",
    "HttpOnly",
    localDev ? "SameSite=Lax" : "SameSite=None",
    localDev ? "" : "Secure",
    `Max-Age=${maxAge}`,
  ].filter(Boolean);
  headers.append("Set-Cookie", parts.join("; "));
}

export function appendClearSessionCookie(headers: Headers, host: string): void {
  const localDev = isLocalHost(host);
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    localDev ? "SameSite=Lax" : "SameSite=None",
    localDev ? "" : "Secure",
    "Max-Age=0",
  ].filter(Boolean);
  headers.append("Set-Cookie", parts.join("; "));
}

export { SESSION_COOKIE };
