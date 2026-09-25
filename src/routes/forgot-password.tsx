import { toastError } from "@/lib/toast-message";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { markPasswordRecoveryPending } from "@/lib/password-recovery";
import { requestPasswordReset, verifyPasswordResetOtp } from "@/lib/auth.functions";
import {
  adminLabel,
  adminInput,
  adminCard,
  adminBtnPrimary,
  adminSectionTitle,
  adminSectionSubtitle,
} from "@/lib/admin-ui";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset Password — Body Inc Practitioners" },
      {
        name: "description",
        content: "Request a password reset code for your practitioner account.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().trim().email().max(255) });
const codeSchema = z.string().trim().regex(/^\d{6,8}$/u, "Enter the code from the email");

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const requestReset = useServerFn(requestPasswordReset);
  const verifyCode = useServerFn(verifyPasswordResetOtp);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<{
    message: string;
    redirectUrl?: string;
  } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPortalError(null);
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError("Enter a valid email.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await requestReset({
        data: { email: parsed.data.email, origin: window.location.origin },
      });
      if (!result.ok) {
        if (result.error === "wrong_portal") {
          setPortalError({ message: result.message, redirectUrl: result.redirectUrl });
          return;
        }
        toast.error(result.message);
        return;
      }
      markPasswordRecoveryPending();
      setSent(true);
    } catch (err) {
      toast.error(toastError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = codeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter the code from the email.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await verifyCode({ data: { email, token: parsed.data } });
      if (!result.ok) {
        if (result.error === "wrong_portal") {
          setPortalError({ message: result.message, redirectUrl: result.redirectUrl });
          return;
        }
        toast.error(result.message);
        return;
      }
      markPasswordRecoveryPending();
      const { error: sessionError } = await supabase.auth.setSession(result.session);
      if (sessionError) {
        toast.error("Could not start your session. Please try again.");
        return;
      }
      navigate({ to: "/reset-password", replace: true });
    } catch (err) {
      toast.error(toastError(err));
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
          <CardTitle className={adminSectionTitle}>Forgot your password?</CardTitle>
          <CardDescription className={adminSectionSubtitle}>
            {sent
              ? "Enter the code from your email. Ignore any other email that asks you to click a link."
              : "Enter your email and we'll send you a reset code."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {portalError ? (
            <div className="mb-4 rounded-[10px] border border-[#B8684B]/40 bg-[#FBF1EC] p-3 text-sm">
              <p className="font-medium text-[#3B4759]">{portalError.message}</p>
              {portalError.redirectUrl && (
                <a
                  href={portalError.redirectUrl}
                  className="mt-2 inline-block font-semibold text-[#B8684B] underline-offset-4 hover:underline"
                >
                  Go to the correct portal →
                </a>
              )}
            </div>
          ) : null}
          {sent ? (
            <form onSubmit={onVerify} className="space-y-4" noValidate>
              <p className="text-center text-[14px] font-medium text-[#3B4759]/80">
                If an account exists for{" "}
                <strong className="font-semibold text-[#3B4759]">{email}</strong>, a reset code is
                on its way.
              </p>
              <div className="space-y-2">
                <Label htmlFor="code" className={adminLabel}>
                  Reset code
                </Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={submitting}
                  required
                  className={adminInput}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <Button type="submit" className={`${adminBtnPrimary} w-full`} disabled={submitting}>
                {submitting ? "Checking…" : "Continue"}
              </Button>
              <p className="text-center text-[14px]">
                <Link
                  to="/auth"
                  className="font-medium text-[#6A9B9C] underline-offset-4 hover:text-[#5B8788] hover:underline"
                >
                  Back to sign in
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className={adminLabel}>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                  className={adminInput}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <Button type="submit" className={`${adminBtnPrimary} w-full`} disabled={submitting}>
                {submitting ? "Sending…" : "Send reset code"}
              </Button>
              <p className="text-center text-[14px]">
                <Link
                  to="/auth"
                  className="font-medium text-[#6A9B9C] underline-offset-4 hover:text-[#5B8788] hover:underline"
                >
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
