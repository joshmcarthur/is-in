/** Inlined from apps/management/public/styles.css (light theme). */
const PAGE_BG = "#ffffff";
const FG = "#1c1b19";
const MUTED = "#5c5a57";
const LINE = "#e8e6e3";
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export function formatOtpCode(code: string): string {
  if (code.length !== 6) {
    return code;
  }
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

export function buildOtpEmailContent({
  code,
  expiresMinutes,
}: {
  code: string;
  expiresMinutes: number;
}): { html: string; text: string } {
  const displayCode = formatOtpCode(code);
  const expiryLine = `This code will expire in ${expiresMinutes} minutes.`;
  const ignoreLine = "If you didn't request this code, you can safely ignore this email.";
  const footer = "is-in.nz — your place on the NZ internet.";

  const text = [
    "Here is your sign in code",
    "",
    displayCode,
    "",
    expiryLine,
    "",
    ignoreLine,
    "",
    footer,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en-NZ">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sign in code</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};font-family:${FONT};font-size:1.075rem;line-height:1.7;letter-spacing:0.018em;color:${FG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAGE_BG};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td style="background-color:${PAGE_BG};border:1px solid ${LINE};border-radius:0.625rem;padding:48px 32px;text-align:center;">
              <p style="margin:0 0 32px;font-size:1.075rem;line-height:1.7;color:${FG};">Here is your sign in code</p>
              <p style="margin:0 0 20px;font-size:64px;font-weight:700;line-height:1;letter-spacing:0.06em;color:${FG};">${displayCode}</p>
              <p style="margin:0;font-size:15px;line-height:1.65;color:${MUTED};">${expiryLine}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;font-size:15px;line-height:1.65;color:${MUTED};">
              <p style="margin:0 0 24px;">${ignoreLine}</p>
              <p style="margin:0;color:${FG};">${footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text };
}
