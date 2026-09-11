/** Lowercase email; minimal normalisation (full IDNA left to clients / later). */
export function canonicalEmail(email: string): string {
  const t = email.trim();
  const at = t.lastIndexOf("@");
  if (at <= 0) return t.toLowerCase();
  const local = t.slice(0, at);
  const domain = t.slice(at + 1);
  return `${local.toLowerCase()}@${domain.toLowerCase()}`;
}
