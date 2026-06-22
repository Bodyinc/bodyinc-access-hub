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
  token: z.string().trim().regex(/^\d{6}$/u, "Enter the 6-digit code"),
});

function serverSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
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
      error:
        | "invalid_credentials"
        | "invalid_code"
        | "wrong_portal"
        | "no_access";
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
      message:
        "Your account does not have portal access. Please contact your administrator.",
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

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
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

    const { data: role, error: roleError } = await supabase.rpc(
      "get_user_portal",
      { _user_id: signInData.user.id },
    );

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

export const sendLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const supabase = serverSupabase();
    // Don't leak whether the account exists. Always return ok.
    await supabase.auth.signInWithOtp({
      email: data.email,
      options: { shouldCreateUser: false },
    });
    return { ok: true };
  });

export const verifyLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifyOtpSchema.parse(input))
  .handler(async ({ data }): Promise<SignInResult> => {
    const supabase = serverSupabase();

    const { data: verifyData, error: verifyError } =
      await supabase.auth.verifyOtp({
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

    const { data: role, error: roleError } = await supabase.rpc(
      "get_user_portal",
      { _user_id: verifyData.user.id },
    );

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