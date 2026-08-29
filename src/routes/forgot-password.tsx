import { toastError } from "@/lib/toast-message";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { markPasswordRecoveryPending } from "@/lib/password-recovery";
import { requestPasswordReset } from "@/lib/auth.functions";
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
        content: "Request a password reset link for your practitioner account.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().trim().email().max(255) });

function ForgotPasswordPage() {
  const requestReset = useServerFn(requestPasswordReset);
  const [email, setEmail] = useState("");
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
      const result = await requestReset({ data: { email: parsed.data.email } });
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
            Enter your email and we'll send you a reset link.
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
            <div className="space-y-4 text-center">
              <p className="text-[14px] font-medium text-[#3B4759]/80">
                If an account exists for{" "}
                <strong className="font-semibold text-[#3B4759]">{email}</strong>, a reset link is
                on its way.
              </p>
              <Link
                to="/auth"
                className="inline-block text-[14px] font-medium text-[#6A9B9C] underline-offset-4 hover:text-[#5B8788] hover:underline"
              >
                Back to sign in
              </Link>
            </div>
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
                {submitting ? "Sending…" : "Send reset link"}
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
