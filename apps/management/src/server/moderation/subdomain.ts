export const SUBDOMAIN_MODERATION_MODEL = "@cf/meta/llama-3.2-3b-instruct";

const MODERATION_TIMEOUT_MS = 2500;

export type ModerationResult = { ok: true } | { ok: false; reason: "policy" | "unavailable" };

type ModerationVerdict = {
  allowed: boolean;
  reason: string | null;
};

const SYSTEM_PROMPT = `You are a subdomain name moderator for is-in.nz, a personal identity platform where users claim names like "josh.is-in.nz".

Evaluate whether the proposed subdomain is appropriate for public use. Reject names that:
- Contain hate speech, slurs, or sexual/explicit terms
- Impersonate major brands, banks, or government (e.g. ird, anz, microsoft, paypal)
- Look like phishing or scam patterns (e.g. login, verify-account, support-team)
- Facilitate illegal activity

Allow ordinary personal names, hobbies, place names, and mild edgy words used in non-abusive context.

Treat hyphenated and concatenated forms as equivalent (pay-pal is the same as paypal).

Respond with JSON only, no markdown: {"allowed": boolean, "reason": string | null}
Set reason to a brief explanation when allowed is false; use null when allowed is true.`;

function extractResponseText(result: unknown): string | null {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const r = result as { response?: unknown; result?: unknown };
    if (typeof r.response === "string") return r.response;
    if (typeof r.result === "string") return r.result;
  }
  return null;
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function parseModerationVerdict(raw: string): ModerationVerdict | null {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as Partial<ModerationVerdict>;
    if (typeof parsed.allowed !== "boolean") return null;
    const reason =
      parsed.reason === null || parsed.reason === undefined
        ? null
        : typeof parsed.reason === "string"
          ? parsed.reason
          : null;
    return { allowed: parsed.allowed, reason };
  } catch {
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("moderation_timeout")), ms);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export async function moderateSubdomain(ai: Ai, subdomain: string): Promise<ModerationResult> {
  try {
    const result = await withTimeout(
      ai.run(SUBDOMAIN_MODERATION_MODEL, {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Subdomain to evaluate: "${subdomain}"`,
          },
        ],
        max_tokens: 64,
        temperature: 0.1,
      }),
      MODERATION_TIMEOUT_MS,
    );

    const text = extractResponseText(result);
    if (!text) {
      console.error("subdomain_moderation: empty model response", { subdomain });
      return { ok: false, reason: "unavailable" };
    }

    const verdict = parseModerationVerdict(text);
    if (!verdict) {
      console.error("subdomain_moderation: unparseable model response", { subdomain, text });
      return { ok: false, reason: "unavailable" };
    }

    if (!verdict.allowed) {
      console.info("subdomain_moderation: rejected", { subdomain, reason: verdict.reason });
      return { ok: false, reason: "policy" };
    }

    return { ok: true };
  } catch (err) {
    console.error("subdomain_moderation: error", { subdomain, err });
    return { ok: false, reason: "unavailable" };
  }
}
