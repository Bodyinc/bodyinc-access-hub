import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const ALLOWED_ROLE = "provider" as const;

const PORTAL_URLS: Record<string, string> = {
  admin: "https://admin.bodyinc.com",
  patient: "https://patient.bodyinc.com",
  provider: "https://provider.bodyinc.com",
};

const credentialsSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
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
      session: {
        access_token: string;
        refresh_token: string;
      };
    }
  | {
      ok: false;
      error: "invalid_credentials" | "wrong_portal" | "no_access";
      message: string;
      actualRole?: string;
      redirectUrl?: string;
    };

export const signInAsProvider = createServerFn({ method: "POST" })
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

    const userId = signInData.user.id;

    const { data: role, error: roleError } = await supabase.rpc(
      "get_user_portal",
      { _user_id: userId },
    );

    if (roleError) {
      await supabase.auth.signOut();
      return {
        ok: false,
        error: "no_access",
        message: "Could not verify your account access. Please try again.",
      };
    }

    if (role === ALLOWED_ROLE) {
      return {
        ok: true,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
        },
      };
    }

    // Wrong portal or no role assigned — terminate the session immediately.
    await supabase.auth.signOut();

    if (!role) {
      return {
        ok: false,
        error: "no_access",
        message:
          "Your account does not have practitioner access. Please contact your administrator.",
      };
    }

    const redirectUrl = PORTAL_URLS[role] ?? null;
    const label =
      role === "patient" ? "patient" : role === "admin" ? "administrator" : role;

    return {
      ok: false,
      error: "wrong_portal",
      actualRole: role,
      redirectUrl: redirectUrl ?? undefined,
      message: redirectUrl
        ? `This email is registered as a ${label}. Please log in at ${redirectUrl}.`
        : `This email is registered as a ${label}. Please use the correct portal.`,
    };
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