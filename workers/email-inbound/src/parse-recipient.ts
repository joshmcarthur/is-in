/** Extract `addr@subdomain.root` from common To header shapes. */
export function parseRecipientTo(toRaw: string): string | null {
  const t = toRaw.trim();
  const angle = t.match(/<([^>]+@[^>]+)>/);
  if (angle?.[1]) return angle[1].trim();
  const bare = t.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  return bare?.[0]?.trim() ?? null;
}
