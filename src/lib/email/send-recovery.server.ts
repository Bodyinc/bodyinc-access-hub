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
  const { data, error } = await params.supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: params.email,
    options: { redirectTo: params.redirectTo },
  });
  const rawLink = data?.properties?.action_link?.trim() as string | undefined;
  if (error || !rawLink) {
    return { ok: false, message: error?.message ?? "Could not create a reset link." };
  }

  const userId = (data?.user?.id as string | undefined)?.trim();
  const tokenHash = (data?.properties?.hashed_token as string | undefined)?.trim();
  if (!tokenHash) {
    return { ok: false, message: "Could not create a reset link." };
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
