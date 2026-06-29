import { createFileRoute, redirect } from "@tanstack/react-router";
import { RoutePending } from "@/components/route-pending";
import {
  getPasswordRecoveryRedirectUrl,
  haltForPasswordRecoveryRedirect,
  isPasswordRecoveryPending,
} from "@/lib/password-recovery";

export const Route = createFileRoute("/")({
  ssr: false,
  pendingComponent: () => <RoutePending />,
  beforeLoad: async () => {
    // Auth redirects use sessionStorage/window — must not run during SSR (Vercel 500).
    if (typeof window === "undefined") {
      return;
    }

    const recoveryRedirect = getPasswordRecoveryRedirectUrl();
    if (recoveryRedirect) {
      window.location.replace(recoveryRedirect);
      await haltForPasswordRecoveryRedirect();
    }

    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (
      user &&
      isPasswordRecoveryPending() &&
      window.location.pathname !== "/reset-password"
    ) {
      window.location.replace("/reset-password");
      await haltForPasswordRecoveryRedirect();
    }

    if (!user) {
      throw redirect({ to: "/auth" });
    }
    const cacheKey = `bi_portal_role:${user.id}`;
    let role: string | null = null;
    try { role = sessionStorage.getItem(cacheKey); } catch {}
    if (!role) {
      const { data: fetched } = await supabase.rpc("get_user_portal", {
        _user_id: user.id,
      });
      role = (fetched as string | null) ?? null;
      if (role) {
        try { sessionStorage.setItem(cacheKey, role); } catch {}
      }
    }
    if (role === "admin") throw redirect({ to: "/admin" });
    if (role === "provider") throw redirect({ to: "/dashboard" });
    await supabase.auth.signOut();
    throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Body Inc Practitioner Portal" },
      { name: "description", content: "Practitioner portal for Body Inc." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <RoutePending />,
});
