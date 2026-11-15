import { DEFAULT_PRODUCT_FOOTER } from "../operatorConfig.js";

/** Plain email asking a forward destination's owner to confirm. Inputs are platform-controlled (validated subdomain, our own link). */
export function buildDestinationConfirmEmail({
  siteHost,
  confirmUrl,
  expiresDays,
  footer = DEFAULT_PRODUCT_FOOTER,
}: {
  siteHost: string;
  confirmUrl: string;
  expiresDays: number;
  footer?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Confirm email forwarding from ${siteHost}`;
  const intro = `Someone using ${siteHost} wants to forward email to this address.`;
  const action = "Nothing is forwarded until you confirm.";
  const expiry = `The link expires in ${expiresDays} days.`;
  const ignore = "If you don't recognise this, ignore this email.";

  const text = [intro, action, "", `Confirm: ${confirmUrl}`, "", expiry, ignore, "", footer].join(
    "\n",
  );

  const html = `<!DOCTYPE html>
<html lang="en-NZ">
<head><meta charset="utf-8" /><title>${subject}</title></head>
<body style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#1c1b19;max-width:560px;margin:0 auto;padding:32px 20px;">
  <p>${intro} ${action}</p>
  <p><a href="${confirmUrl}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#1c1b19;color:#ffffff;text-decoration:none;">Review and confirm</a></p>
  <p style="color:#5c5a57;">${expiry} ${ignore}</p>
  <p>${footer}</p>
</body>
</html>`;

  return { subject, html, text };
}
