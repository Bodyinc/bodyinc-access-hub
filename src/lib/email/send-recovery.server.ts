/**
 * Password-reset / invite links via generateLink + Brevo (Body Inc theme).
 * Do not use supabase.auth.resetPasswordForEmail — that sends the purple Auth template.
 */

function withRedirectTo(actionLink: string, redirectTo: string): string {
  try {
    const url = new URL(actionLink);
    if (url.searchParams.has("redirect_to")) {
      url.searchParams.set("redirect_to", redirectTo);
    }
    return url.toString();
  } catch {
    return actionLink;
  }
}

export async function sendThemedRecoveryEmail(params: {
  // Service-role client; keep loose so this helper isn't coupled to generated DB types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any;
  email: string;
  redirectTo: string;
  fullName?: string | null;
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
  // Patient-portal Send Email hook may already have delivered this recovery mail.
  if (userId && tokenHash) {
    const { error: claimErr } = await params.supabaseAdmin.from("email_reminders").insert({
      reminder_type: "auth_recovery",
      target_id: userId,
      period_key: tokenHash,
    });
    if (claimErr?.code === "23505") return { ok: true };
    if (claimErr) {
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

  const { passwordResetEmail } = await import("@/lib/email/auth-emails");
  const { subject, html } = passwordResetEmail({
    resetUrl: withRedirectTo(rawLink, params.redirectTo),
    fullName,
  });
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
