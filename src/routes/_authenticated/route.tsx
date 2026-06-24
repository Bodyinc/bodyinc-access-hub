import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  getPasswordRecoveryRedirectUrl,
  haltForPasswordRecoveryRedirect,
  isPasswordRecoveryPending,
} from "@/lib/password-recovery";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const recoveryRedirect = getPasswordRecoveryRedirectUrl();
      if (recoveryRedirect) {
        window.location.replace(recoveryRedirect);
        await haltForPasswordRecoveryRedirect();
      }
    }

    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) {
      throw redirect({ to: "/auth" });
    }

    if (
      typeof window !== "undefined" &&
      isPasswordRecoveryPending() &&
      window.location.pathname !== "/reset-password"
    ) {
      window.location.replace("/reset-password");
      await haltForPasswordRecoveryRedirect();
    }

    const user = data.session.user;
    const cacheKey = `bi_portal_role:${user.id}`;
    let role: string | null = null;
    try {
      role = sessionStorage.getItem(cacheKey);
    } catch {}

    if (!role) {
      const { data: fetched, error: roleError } = await supabase.rpc("get_user_portal", {
        _user_id: user.id,
      });
      if (roleError) {
        throw redirect({ to: "/auth" });
      }
      role = (fetched as string | null) ?? null;
      if (role) {
        try { sessionStorage.setItem(cacheKey, role); } catch {}
      }
    }

    if (role !== "provider" && role !== "admin") {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }

    return { user, role };
  },
  component: () => <Outlet />,
});