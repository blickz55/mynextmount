/**
 * Optional post-registration email via Resend. No-op if RESEND_API_KEY is unset.
 * https://resend.com/docs/api-reference/emails/send-email
 */
const RESEND_API = "https://api.resend.com/emails";

function siteOrigin(): string {
  const raw =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.mynextmount.com";
  return raw.replace(/\/$/, "");
}

export async function sendRegistrationAckEmail(to: string): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return;

  const from =
    process.env.RESEND_FROM?.trim() ||
    "MyNextMount <onboarding@resend.dev>";
  const origin = siteOrigin();
  const subject = "Welcome to MyNextMount";
  const text = [
    "Thanks for creating a MyNextMount account.",
    "",
    `Sign in: ${origin}/login`,
    "",
    "Save your mount export from the tool to sync your collection across devices.",
    "",
    "— MyNextMount",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p>Thanks for creating a <strong>MyNextMount</strong> account.</p>
  <p><a href="${origin}/login">Sign in</a> whenever you want to load your saved collection.</p>
  <p style="font-size: 14px; color: #444;">Use <strong>Save to my account</strong> on the tool to store your export on the server.</p>
  <p style="font-size: 13px; color: #666;">— MyNextMount</p>
</body>
</html>`.trim();

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
}
