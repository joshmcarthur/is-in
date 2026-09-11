/** Site label from Host header (e.g. `josh` from `josh.test.is-in.nz`). */
export function parseSiteHost(host: string, rootDomain: string): string | null {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  const root = rootDomain.toLowerCase();
  if (h === root || h === `www.${root}`) return null;
  const suffix = `.${root}`;
  if (!h.endsWith(suffix)) return null;
  const sub = h.slice(0, -suffix.length);
  if (!sub || sub.includes(".")) return null;
  return sub;
}

/** Subdomain from a full email address on a zone (e.g. `josh` from `x@josh.example.com`). */
export function parseSiteFromEmailAddress(address: string, rootDomain: string): string | null {
  const addr = address.trim().toLowerCase();
  const at = addr.lastIndexOf("@");
  if (at <= 0) return null;
  return parseSiteHost(addr.slice(at + 1), rootDomain);
}
