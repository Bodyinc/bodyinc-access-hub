/**
 * Brevo transactional email delivery.
 * Templates live in-repo (`src/lib/email.templates.ts`); Brevo only sends the rendered HTML.
 * Safe to import only from server handlers — never from client bundles.
 *
 * Missing API key / sender → skip quietly (log warning).
 * Network/API failures → log and return; callers must not fail clinical actions.
 */

import {
  renderEmailTemplate,
  type EmailParams,
  type EmailTemplateKey,
} from "@/lib/email.templates";

export type { EmailTemplateKey };

export type EmailRecipient = { email: string; name?: string | null };

export type SendTransactionalEmailInput = {
  to: EmailRecipient | EmailRecipient[];
  template: EmailTemplateKey;
  params?: EmailParams;
};

export type SendTransactionalEmailResult =
  | { ok: true; messageId: string | null }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

function brevoApiKey(): string | null {
  // Prefer the REST API key; fall back to SMTP key if that's what was configured.
  return process.env.BREVO_API_KEY?.trim() || process.env.BREVO_SMTP_KEY?.trim() || null;
}

function sender(): { email: string; name?: string } | null {
  const email = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!email) return null;
  const name = process.env.BREVO_SENDER_NAME?.trim();
  return name ? { email, name } : { email };
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<SendTransactionalEmailResult> {
  const apiKey = brevoApiKey();
  if (!apiKey) {
    return { ok: false, skipped: true, reason: "BREVO_API_KEY not set" };
  }

  const from = sender();
  if (!from) {
    return { ok: false, skipped: true, reason: "BREVO_SENDER_EMAIL not set" };
  }

  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((r) => ({
      email: r.email.trim(),
      ...(r.name?.trim() ? { name: r.name.trim() } : {}),
    }))
    .filter((r) => r.email.length > 0);

  if (recipients.length === 0) {
    return { ok: false, skipped: true, reason: "no recipient email" };
  }

  let rendered;
  try {
    rendered = renderEmailTemplate(input.template, input.params ?? {});
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[brevo] render ${input.template} failed:`, error);
    return { ok: false, skipped: false, error };
  }

  const body = {
    sender: from,
    to: recipients,
    subject: rendered.subject,
    htmlContent: rendered.html,
    textContent: rendered.text,
  };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const error = `Brevo ${res.status}: ${text.slice(0, 400)}`;
      console.error(`[brevo] ${input.template} failed:`, error);
      return { ok: false, skipped: false, error };
    }

    const json = (await res.json().catch(() => null)) as { messageId?: string } | null;
    return { ok: true, messageId: json?.messageId ?? null };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[brevo] ${input.template} request error:`, error);
    return { ok: false, skipped: false, error };
  }
}

/** Fire-and-forget wrapper — never throws. */
export function queueTransactionalEmail(input: SendTransactionalEmailInput): void {
  void sendTransactionalEmail(input).then((result) => {
    if (!result.ok && result.skipped) {
      console.warn(`[brevo] skipped ${input.template}: ${result.reason}`);
    }
  });
}
