/**
 * Password-reset / invite links via generateLink + Brevo (Body Inc theme).
 * Do not use supabase.auth.resetPasswordForEmail — that sends the purple Auth template.
 *
 * The email button must open the portal directly. Supabase's action_link verifies on
 * the project host and then follows Site URL, which is the patient portal.
 */

export function portalRecoveryUrl(redirectTo: string, tokenHash: string): string {
  const url = new URL(redirectTo);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "recovery");
  return url.toString();
}

export type GeneratedAuthLink = {
  userId: string | null;
  emailOtp: string | null;
  tokenHash: string | null;
  error: string | null;
};

function readGeneratedLink(body: unknown): Omit<GeneratedAuthLink, "error"> {
  const row = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const properties =
    row.properties && typeof row.properties === "object"
      ? (row.properties as Record<string, unknown>)
      : row;
  const user =
    row.user && typeof row.user === "object" ? (row.user as Record<string, unknown>) : null;
  const otpRaw = properties.email_otp ?? row.email_otp;
  const otp = otpRaw == null ? "" : String(otpRaw).trim();
  const hashRaw = properties.hashed_token ?? row.hashed_token;
  const hash = typeof hashRaw === "string" ? hashRaw.trim() : "";
  const idRaw = user?.id ?? row.id;
  const userId = typeof idRaw === "string" ? idRaw.trim() : "";
  return {
    userId: userId || null,
    emailOtp: /^\d{6,8}$/u.test(otp) ? otp : null,
    tokenHash: hash || null,
  };
}

/** Admin generate_link. Keeps the token even when the Send Email hook returns an error. */
export async function generateAuthLink(params: {
  type: "recovery" | "magiclink";
  email: string;
  redirectTo?: string;
}): Promise<GeneratedAuthLink> {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { userId: null, emailOtp: null, tokenHash: null, error: "Auth is not configured." };
  }

  const post = async (redirectTo?: string) => {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: params.type,
        email: params.email,
        ...(redirectTo ? { options: { redirect_to: redirectTo } } : {}),
      }),
    });
    const json = (await response.json().catch(() => null)) as
      | (Record<string, unknown> & { msg?: string; error_description?: string; message?: string })
      | null;
    const parsed = readGeneratedLink(json);
    const error = response.ok
      ? null
      : json?.msg || json?.error_description || json?.message || `Could not create a link (${response.status}).`;
    return { ...parsed, error };
  };

  const first = await post(params.redirectTo);
  if (first.tokenHash || first.emailOtp || !params.redirectTo) return first;
  console.error("[auth] generate_link with redirect failed:", first.error);
  return post(undefined);
}

export async function sendThemedRecoveryEmail(params: {
  // Service-role client; keep loose so this helper isn't coupled to generated DB types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any;
  email: string;
  redirectTo: string;
  fullName?: string | null;
  /** Invite is the first email after an admin adds a practitioner. */
  kind?: "reset" | "invite";
  portalUrl?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const generated = await generateAuthLink({
    type: "recovery",
    email: params.email,
    redirectTo: params.redirectTo,
  });
  const userId = generated.userId;
  const tokenHash = generated.tokenHash;
  if (!tokenHash) {
    return { ok: false, message: generated.error ?? "Could not create a reset link." };
  }
  // A patient-portal Send Email hook may also deliver this recovery mail, and that
  // copy follows the patient Site URL. Still send the portal link below.
  if (userId) {
    const { error: claimErr } = await params.supabaseAdmin.from("email_reminders").insert({
      reminder_type: "auth_recovery",
      target_id: userId,
      period_key: tokenHash,
    });
    if (claimErr && claimErr.code !== "23505") {
      console.error("[auth] recovery claim failed:", claimErr.message);
    }
  }

  let fullName = params.fullName ?? null;
  if (!fullName && userId) {
    const { data: profile } = await params.supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    fullName = profile?.full_name ?? null;
  }

  const { passwordResetEmail, providerInviteEmail } = await import("@/lib/email/auth-emails");
  const resetUrl = portalRecoveryUrl(params.redirectTo, tokenHash);
  const { subject, html } =
    params.kind === "invite"
      ? providerInviteEmail({ resetUrl, fullName, portalUrl: params.portalUrl })
      : passwordResetEmail({ resetUrl, fullName });
  const { sendTransactionalEmail } = await import("@/integrations/brevo/client.server");
  const sent = await sendTransactionalEmail({
    to: { email: params.email, name: fullName },
    subject,
    html,
  });
  if (!sent.ok) {
    if (userId && tokenHash) {
      await params.supabaseAdmin
        .from("email_reminders")
        .delete()
        .eq("reminder_type", "auth_recovery")
        .eq("target_id", userId)
        .eq("period_key", tokenHash);
    }
    return { ok: false, message: sent.skipped ? sent.reason : sent.error };
  }
  return { ok: true };
}
