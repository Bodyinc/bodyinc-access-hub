import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const ALLOWED_ROLES = ["admin", "provider"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

const PORTAL_URLS: Record<string, string> = {
  admin: "https://admin.bodyinc.com",
  patient: "https://patient.bodyinc.com",
  provider: "https://provider.bodyinc.com",
};

const credentialsSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

const emailSchema = z.object({
  email: z.string().trim().email().max(255),
});

const verifyOtpSchema = z.object({
  email: z.string().trim().email().max(255),
  token: z
    .string()
    .trim()
    .regex(/^\d{8}$/u, "Enter the 8-digit code"),
});

function serverSupabase() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export type SignInResult =
  | {
      ok: true;
      role: AllowedRole;
      session: {
        access_token: string;
        refresh_token: string;
      };
    }
  | {
      ok: false;
      error: "invalid_credentials" | "invalid_code" | "wrong_portal" | "no_access";
      message: string;
      actualRole?: string;
      redirectUrl?: string;
    };

function buildRoleResult(
  role: string | null,
  session: { access_token: string; refresh_token: string },
): SignInResult {
  if (role && (ALLOWED_ROLES as readonly string[]).includes(role)) {
    return { ok: true, role: role as AllowedRole, session };
  }
  if (!role) {
    return {
      ok: false,
      error: "no_access",
      message: "Your account does not have portal access. Please contact your administrator.",
    };
  }
  const redirectUrl = PORTAL_URLS[role];
  const label = role === "patient" ? "patient" : role;
  return {
    ok: false,
    error: "wrong_portal",
    actualRole: role,
    redirectUrl,
    message: redirectUrl
      ? `This email is registered as a ${label}. Please log in at ${redirectUrl}.`
      : `This email is registered as a ${label}. Please use the correct portal.`,
  };
}

export const signInWithPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => credentialsSchema.parse(input))
  .handler(async ({ data }): Promise<SignInResult> => {
    const supabase = serverSupabase();

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (signInError || !signInData.session || !signInData.user) {
      return {
        ok: false,
        error: "invalid_credentials",
        message: "Invalid email or password.",
      };
    }

    const { data: role, error: roleError } = await supabase.rpc("get_user_portal", {
      _user_id: signInData.user.id,
    });

    if (roleError) {
      await supabase.auth.signOut();
      return {
        ok: false,
        error: "no_access",
        message: "Could not verify your account access. Please try again.",
      };
    }

    const result = buildRoleResult(role as string | null, {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    });
    if (!result.ok) {
      await supabase.auth.signOut();
    }
    return result;
  });

function adminAppUrl(): string {
  return (process.env.ADMIN_APP_URL || process.env.APP_URL || PORTAL_URLS.admin)
    .trim()
    .replace(/\/$/, "");
}

async function roleForEmail(supabaseAdmin: any, email: string): Promise<string | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("email", email.replace(/[%_]/g, ""))
    .maybeSingle();
  if (!profile?.id) return null;
  const { data: roleRow } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", profile.id)
    .maybeSingle();
  return (roleRow?.role as string | null) ?? null;
}

export type RequestPasswordResetResult =
  | { ok: true }
  | {
      ok: false;
      error: "wrong_portal" | "send_failed";
      message: string;
      actualRole?: string;
      redirectUrl?: string;
    };

export const sendLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    // Don't leak whether the account exists. Always return ok to the client.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: data.email,
      });
      if (error) {
        console.error("[auth] sendLoginOtp generateLink failed:", error.message);
        return { ok: true };
      }

      const code = linkData?.properties?.email_otp?.trim();
      if (!code) {
        console.error("[auth] sendLoginOtp missing email_otp from generateLink");
        return { ok: true };
      }

      let fullName: string | null = null;
      if (linkData.user?.id) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", linkData.user.id)
          .maybeSingle();
        fullName = (profile as { full_name?: string | null } | null)?.full_name ?? null;
      }

      const { verificationCodeEmail } = await import("@/lib/email/auth-emails");
      const { subject, html } = verificationCodeEmail({ code, fullName, purpose: "login" });
      const { sendTransactionalEmail } = await import("@/integrations/brevo/client.server");
      const sent = await sendTransactionalEmail({
        to: { email: data.email, name: fullName },
        subject,
        html,
      });
      if (!sent.ok) {
        console.error("[auth] sendLoginOtp email failed:", sent.skipped ? sent.reason : sent.error);
      }
    } catch (e) {
      console.error("[auth] sendLoginOtp failed:", e);
    }
    return { ok: true };
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailSchema.parse(input))
  .handler(async ({ data }): Promise<RequestPasswordResetResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const role = await roleForEmail(supabaseAdmin, data.email);

      if (role === "patient" || role === "provider") {
        const redirectUrl = PORTAL_URLS[role];
        const label = role === "patient" ? "patient" : role;
        return {
          ok: false,
          error: "wrong_portal",
          message: redirectUrl
            ? `This email is registered as a ${label}. Please log in at ${redirectUrl}.`
            : `This email is registered as a ${label}. Please use the correct portal.`,
          actualRole: role,
          redirectUrl,
        };
      }

      // Unknown / non-admin: same as the built-in reset — do not reveal the account.
      if (role !== "admin") return { ok: true };

      const redirectTo = `${adminAppUrl()}/auth/callback?next=/reset-password`;
      const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
        options: { redirectTo },
      });
      const resetUrl = linkData?.properties?.action_link?.trim();
      if (error || !resetUrl) {
        console.error("[auth] requestPasswordReset generateLink failed:", error?.message);
        return {
          ok: false,
          error: "send_failed",
          message: "Could not send a reset link. Please try again.",
        };
      }

      let fullName: string | null = null;
      if (linkData.user?.id) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", linkData.user.id)
          .maybeSingle();
        fullName = (profile as { full_name?: string | null } | null)?.full_name ?? null;
      }

      const { passwordResetEmail } = await import("@/lib/email/auth-emails");
      const { subject, html } = passwordResetEmail({ resetUrl, fullName });
      const { sendTransactionalEmail } = await import("@/integrations/brevo/client.server");
      const sent = await sendTransactionalEmail({
        to: { email: data.email, name: fullName },
        subject,
        html,
      });
      if (!sent.ok) {
        console.error(
          "[auth] requestPasswordReset email failed:",
          sent.skipped ? sent.reason : sent.error,
        );
        return {
          ok: false,
          error: "send_failed",
          message: "Could not send email. Please try again.",
        };
      }
      return { ok: true };
    } catch (e) {
      console.error("[auth] requestPasswordReset failed:", e);
      return {
        ok: false,
        error: "send_failed",
        message: "Could not send a reset link. Please try again.",
      };
    }
  });

export const verifyLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifyOtpSchema.parse(input))
  .handler(async ({ data }): Promise<SignInResult> => {
    const supabase = serverSupabase();

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: data.email,
      token: data.token,
      type: "email",
    });

    if (verifyError || !verifyData.session || !verifyData.user) {
      return {
        ok: false,
        error: "invalid_code",
        message: "Invalid or expired code. Please request a new one.",
      };
    }

    const { data: role, error: roleError } = await supabase.rpc("get_user_portal", {
      _user_id: verifyData.user.id,
    });

    if (roleError) {
      await supabase.auth.signOut();
      return {
        ok: false,
        error: "no_access",
        message: "Could not verify your account access. Please try again.",
      };
    }

    const result = buildRoleResult(role as string | null, {
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
    });
    if (!result.ok) {
      await supabase.auth.signOut();
    }
    return result;
  });

export const getCurrentPortalRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ role: string | null }> => {
    const { data, error } = await context.supabase.rpc("get_user_portal", {
      _user_id: context.userId,
    });
    if (error) return { role: null };
    return { role: (data as string | null) ?? null };
  });
