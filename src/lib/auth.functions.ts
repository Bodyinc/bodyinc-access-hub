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
  .handler(async (): Promise<{ role: string | null }> => {
    // Lazy import to avoid client-bundling the auth middleware module graph here.
    const { requireSupabaseAuth } = await import(
      "@/integrations/supabase/auth-middleware"
    );
    // Re-wrap: middleware attaches per call; using it inline isn't supported,
    // so we instead read the bearer from the request via getRequest.
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return { role: null };
    const token = authHeader.slice(7);

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return { role: null };

    const { data: role } = await supabase.rpc("get_user_portal", {
      _user_id: userData.user.id,
    });

    void requireSupabaseAuth; // keep import referenced for type parity
    return { role: (role as string | null) ?? null };
  });