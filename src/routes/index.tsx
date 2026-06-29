import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { RoutePending } from "@/components/route-pending";
import {
  getPasswordRecoveryRedirectUrl,
  isPasswordRecoveryPending,
} from "@/lib/password-recovery";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Body Inc Practitioner Portal" },
      { name: "description", content: "Practitioner portal for Body Inc." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    void (async () => {
      const recoveryRedirect = getPasswordRecoveryRedirectUrl();
      if (recoveryRedirect) {
        window.location.replace(recoveryRedirect);
        return;
      }

      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      const user = data.session?.user;

      if (
        user &&
        isPasswordRecoveryPending() &&
        window.location.pathname !== "/reset-password"
      ) {
        window.location.replace("/reset-password");
        return;
      }

      if (!user) {
        navigate({ to: "/auth", replace: true });
        return;
      }

      const cacheKey = `bi_portal_role:${user.id}`;
      let role: string | null = null;
      try {
        role = sessionStorage.getItem(cacheKey);
      } catch {}

      if (!role) {
        const { data: fetched, error } = await supabase.rpc("get_user_portal", {
          _user_id: user.id,
        });
        if (!active) return;
        if (error) {
          console.error("[home] get_user_portal failed:", error);
          navigate({ to: "/auth", replace: true });
          return;
        }
        role = (fetched as string | null) ?? null;
        if (role) {
          try {
            sessionStorage.setItem(cacheKey, role);
          } catch {}
        }
      }

      if (!active) return;
      if (role === "admin") navigate({ to: "/admin", replace: true });
      else if (role === "provider") navigate({ to: "/dashboard", replace: true });
      else {
        await supabase.auth.signOut();
        navigate({ to: "/auth", replace: true });
      }
    })();

    return () => {
      active = false;
    };
  }, [navigate]);

  return <RoutePending />;
}
