import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { markPasswordRecoveryPending } from "@/lib/password-recovery";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Signing you in — Body Inc" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const url = new URL(window.location.href);
      const nextRaw = url.searchParams.get("next") || "/";
      const next = nextRaw.startsWith("/") ? nextRaw : "/";
      const isPasswordReset = next === "/reset-password";
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      const errorDesc =
        url.searchParams.get("error_description") ||
        url.hash.match(/error_description=([^&]+)/)?.[1];

      if (isPasswordReset) markPasswordRecoveryPending();

      if (errorDesc) {
        if (isPasswordReset) {
          window.location.replace("/reset-password?error=link_expired");
          return;
        }
        if (!cancelled) setMessage(decodeURIComponent(errorDesc));
        return;
      }

      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: (type as "recovery") || "recovery",
          token_hash: tokenHash,
        });
        if (cancelled) return;
        if (error) {
          window.location.replace(
            isPasswordReset ? "/reset-password?error=link_expired" : "/auth?error=auth_callback",
          );
          return;
        }
        window.location.replace(isPasswordReset ? `${next}?recovery=1` : next);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          window.location.replace(
            isPasswordReset ? "/reset-password?error=link_expired" : "/auth?error=auth_callback",
          );
          return;
        }
        window.location.replace(isPasswordReset ? `${next}?recovery=1` : next);
        return;
      }

      if (isPasswordReset) {
        window.location.replace("/reset-password?error=link_expired");
        return;
      }
      if (!cancelled) {
        setMessage("Could not complete sign-in. Please try again.");
        navigate({ to: "/auth", replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 font-['DM_Sans',sans-serif]">
      <p className="text-[14px] font-medium text-[#3B4759]/80">{message}</p>
    </div>
  );
}
