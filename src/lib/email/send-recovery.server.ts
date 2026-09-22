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

  let fullName = params.fullName ?? null;
  if (!fullName && data?.user?.id) {
    const { data: profile } = await params.supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", data.user.id)
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
    return { ok: false, message: sent.skipped ? sent.reason : sent.error };
  }
  return { ok: true };
}
