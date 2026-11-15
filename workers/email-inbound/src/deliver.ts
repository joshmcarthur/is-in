export type DeliveryResult = { ok: true } | { ok: false; error: string };

/** Native Email Routing forward. Cloudflare only accepts verified destination addresses. */
export async function deliverNative(
  message: ForwardableEmailMessage,
  destination: string,
): Promise<DeliveryResult> {
  try {
    await message.forward(destination);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
