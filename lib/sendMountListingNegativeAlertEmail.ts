/**
 * Admin alert when farm-listing feedback is heavily negative (Resend).
 * No-op if RESEND_API_KEY is unset (same posture as registration ack).
 */
const RESEND_API = "https://api.resend.com/emails";

function siteOrigin(): string {
  const raw =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.mynextmount.com";
  return raw.replace(/\/$/, "");
}

export async function sendMountListingNegativeAlertEmail(opts: {
  to: string;
  spellId: number;
  mountName: string;
  upCount: number;
  downCount: number;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return;

  const from =
    process.env.RESEND_FROM?.trim() ||
    "MyNextMount <onboarding@resend.dev>";
  const origin = siteOrigin();
  const subject = `[MyNextMount] Listing feedback alert: ${opts.mountName}`;
  const text = [
    `Mount: ${opts.mountName}`,
    `Summon spell ID: ${opts.spellId}`,
    `Thumbs up: ${opts.upCount} · Thumbs down: ${opts.downCount}`,
    "",
    "Threshold: at least 2 downvotes and zero upvotes on this listing.",
    "Review the mount card, guides, and community thread on the tool.",
    "",
    `Open tool: ${origin}/tool`,
    "",
    "— MyNextMount (automated)",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p><strong>Listing feedback alert</strong></p>
  <p><strong>${escapeHtml(opts.mountName)}</strong> (spell <code>${opts.spellId}</code>)</p>
  <p>Thumbs up: <strong>${opts.upCount}</strong> · Thumbs down: <strong>${opts.downCount}</strong></p>
  <p style="font-size: 14px; color: #444;">Threshold: at least 2 downvotes and no upvotes. Consider checking copy, Quick steps, or Wowhead alignment.</p>
  <p><a href="${origin}/tool">Open the tool</a></p>
  <p style="font-size: 13px; color: #666;">— MyNextMount (automated)</p>
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
      to: [opts.to],
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
