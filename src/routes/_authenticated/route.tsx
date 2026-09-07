import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  getPasswordRecoveryRedirectUrl,
  haltForPasswordRecoveryRedirect,
  isPasswordRecoveryPending,
} from "@/lib/password-recovery";
import { isBrowser } from "@/lib/is-browser";
import { ensureSession } from "@/lib/auth-session-cache";
import { cachePortalRole, readCachedPortalRole } from "@/lib/portal-role-cache";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  shouldReload: false,
  beforeLoad: async () => {
    if (!isBrowser()) {
      return;
    }

    const recoveryRedirect = getPasswordRecoveryRedirectUrl();
    if (recoveryRedirect) {
      window.location.replace(recoveryRedirect);
      await haltForPasswordRecoveryRedirect();
    }

    const session = await ensureSession();
    if (!session?.user) {
      throw redirect({ to: "/auth" });
    }

    if (isPasswordRecoveryPending() && window.location.pathname !== "/reset-password") {
      window.location.replace("/reset-password");
      await haltForPasswordRecoveryRedirect();
    }

    const user = session.user;
    let role = readCachedPortalRole(user.id);

    if (!role) {
      const { data: fetched, error: roleError } = await supabase.rpc("get_user_portal", {
        _user_id: user.id,
      });
      if (roleError) {
        throw redirect({ to: "/auth" });
      }
      role = (fetched as string | null) ?? null;
      cachePortalRole(user.id, role);
    }

    if (role !== "provider" && role !== "admin") {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }

    return { user, role };
  },
  component: () => <Outlet />,
});
