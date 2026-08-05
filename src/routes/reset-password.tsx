import { toastError } from "@/lib/toast-message";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { clearPasswordRecoveryPending } from "@/lib/password-recovery";
import { cachePortalRole } from "@/lib/portal-role-cache";
import {
  adminLabel,
  adminInput,
  adminCard,
  adminBtnPrimary,
  adminSectionTitle,
  adminSectionSubtitle,
} from "@/lib/admin-ui";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set New Password — Body Inc Practitioners" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "Must be at least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      const errorDesc =
        url.searchParams.get("error_description") ||
        url.hash.match(/error_description=([^&]+)/)?.[1];

      if (errorDesc) {
        if (!cancelled) setLinkError(decodeURIComponent(errorDesc));
        return;
      }

      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: (type as "recovery") || "recovery",
          token_hash: tokenHash,
        });
        if (!cancelled) {
          if (error) {
            setLinkError("This reset link is invalid or has expired. Please request a new one.");
          } else {
            setReady(true);
            window.history.replaceState({}, "", url.pathname);
          }
        }
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled) {
          if (error)
            setLinkError("This reset link is invalid or has expired. Please request a new one.");
          else {
            setReady(true);
            window.history.replaceState({}, "", url.pathname);
          }
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        if (data.session) {
          setReady(true);
          if (window.location.hash) {
            window.history.replaceState({}, "", url.pathname);
          }
        } else if (!window.location.hash) {
          setLinkError("This reset link is invalid or has expired. Please request a new one.");
        }
      }
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      const errs: { password?: string; confirm?: string } = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as "password" | "confirm";
        if (!errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) {
        toast.error(toastError(error));
        return;
      }
      clearPasswordRecoveryPending();
      toast.success("Password updated. Signing you in…");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: role } = await supabase.rpc("get_user_portal", { _user_id: user.id });
        if (role === "admin" || role === "provider") {
          cachePortalRole(user.id, role);
          await router.invalidate();
          navigate({
            to: role === "admin" ? "/admin" : role === "provider" ? "/provider" : "/dashboard",
            replace: true,
          });
          return;
        }
      }

      await supabase.auth.signOut();
      toast.error("Your account does not have portal access.");
      navigate({ to: "/auth", replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 font-['DM_Sans',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
      `}</style>

      <Card className={`${adminCard} w-full max-w-md`}>
        <CardHeader className="space-y-3 p-4 text-center sm:p-6">
          <img
            src="/logo.svg"
            alt="Body Inc"
            className="mx-auto h-auto max-h-[48px] w-full max-w-[160px] object-contain"
          />
          <CardTitle className={adminSectionTitle}>Set a new password</CardTitle>
          <CardDescription className={`${adminSectionSubtitle} break-words`}>
            {linkError
              ? linkError
              : ready
                ? "Choose a new password for your practitioner account."
                : "Verifying your reset link…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {linkError ? (
            <div className="space-y-4 text-center">
              <Link
                to="/forgot-password"
                className={`${adminBtnPrimary} inline-flex w-full items-center justify-center sm:w-auto`}
              >
                Request a new link
              </Link>
              <div>
                <Link
                  to="/auth"
                  className="text-[14px] font-medium text-[#6A9B9C] underline-offset-4 hover:text-[#5B8788] hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="password" className={adminLabel}>
                  New password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting || !ready}
                  required
                  className={adminInput}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className={adminLabel}>
                  Confirm password
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={submitting || !ready}
                  required
                  className={adminInput}
                />
                {errors.confirm && <p className="text-sm text-destructive">{errors.confirm}</p>}
              </div>
              <Button
                type="submit"
                className={`${adminBtnPrimary} w-full`}
                disabled={submitting || !ready}
              >
                {submitting ? "Saving…" : "Save new password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
