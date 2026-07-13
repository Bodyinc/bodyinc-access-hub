import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  sendLoginOtp,
  signInWithPassword,
  verifyLoginOtp,
  type SignInResult,
} from "@/lib/auth.functions";
import { clearPasswordRecoveryPending } from "@/lib/password-recovery";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign In — Body Inc" },
      { name: "description", content: "Sign in to the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const passwordSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const emailOnlySchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const signInPw = useServerFn(signInWithPassword);
  const sendOtp = useServerFn(sendLoginOtp);
  const verifyOtp = useServerFn(verifyLoginOtp);

  const [portalError, setPortalError] = useState<{
    message: string;
    redirectUrl?: string;
  } | null>(null);

  // Password tab state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwErrors, setPwErrors] = useState<{ email?: string; password?: string }>({});

  // OTP tab state
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStage, setOtpStage] = useState<"request" | "verify">("request");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpEmailError, setOtpEmailError] = useState<string | undefined>();

  async function handleSession(result: SignInResult) {
    if (!result.ok) {
      if (result.error === "wrong_portal" || result.error === "no_access") {
        setPortalError({ message: result.message, redirectUrl: result.redirectUrl });
      } else {
        toast.error(result.message);
      }
      return;
    }
    const { error } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });
    if (error) {
      toast.error("Could not start your session. Please try again.");
      return;
    }
    clearPasswordRecoveryPending();
    await router.invalidate();
    navigate({ to: result.role === "admin" ? "/admin" : "/dashboard" });
  }

  async function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPwErrors({});
    setPortalError(null);

    const parsed = passwordSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as "email" | "password";
        if (!errs[k]) errs[k] = issue.message;
      }
      setPwErrors(errs);
      return;
    }

    setPwSubmitting(true);
    try {
      const result = await signInPw({ data: parsed.data });
      await handleSession(result);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPwSubmitting(false);
    }
  }

  async function onSendOtp(e: FormEvent) {
    e.preventDefault();
    setOtpEmailError(undefined);
    setPortalError(null);

    const parsed = emailOnlySchema.safeParse({ email: otpEmail });
    if (!parsed.success) {
      setOtpEmailError(parsed.error.issues[0]?.message ?? "Enter a valid email");
      return;
    }
    setOtpSubmitting(true);
    try {
      await sendOtp({ data: parsed.data });
      setOtpStage("verify");
      toast.success("If an account exists, an 8-digit code was sent.");
    } catch (err) {
      console.error(err);
      toast.error("Could not send code. Please try again.");
    } finally {
      setOtpSubmitting(false);
    }
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setPortalError(null);
    if (otpCode.length !== 8) {
      toast.error("Enter the 8-digit code.");
      return;
    }
    setOtpSubmitting(true);
    try {
      const result = await verifyOtp({
        data: { email: otpEmail, token: otpCode },
      });
      await handleSession(result);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setOtpSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-surface px-4 py-12">
      <Card className="w-full max-w-md p-2 shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2">
            <img src="/logo.svg" alt="Body Inc" className="h-10 w-auto object-contain" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-brand">Sign In</CardTitle>
          <CardDescription className="text-brand-strong/80">
            Body Inc — Practitioner & Admin portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="otp">Email OTP</TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="mt-4">
              <form onSubmit={onPasswordSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={pwSubmitting}
                    required
                  />
                  {pwErrors.email && (
                    <p className="text-sm text-destructive">{pwErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={pwSubmitting}
                    required
                  />
                  {pwErrors.password && (
                    <p className="text-sm text-destructive">{pwErrors.password}</p>
                  )}
                </div>

                {portalError && <PortalErrorBox error={portalError} />}

                <Button type="submit" className="w-full" disabled={pwSubmitting}>
                  {pwSubmitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="otp" className="mt-4">
              {otpStage === "request" ? (
                <form onSubmit={onSendOtp} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="otp-email">Email</Label>
                    <Input
                      id="otp-email"
                      type="email"
                      autoComplete="email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      disabled={otpSubmitting}
                      required
                    />
                    {otpEmailError && (
                      <p className="text-sm text-destructive">{otpEmailError}</p>
                    )}
                  </div>
                  {portalError && <PortalErrorBox error={portalError} />}
                  <Button type="submit" className="w-full" disabled={otpSubmitting}>
                    {otpSubmitting ? "Sending…" : "Send code"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={onVerifyOtp} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label>Enter the 8-digit code sent to {otpEmail}</Label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={8}
                        value={otpCode}
                        onChange={(v) => setOtpCode(v)}
                        disabled={otpSubmitting}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                          <InputOTPSlot index={6} />
                          <InputOTPSlot index={7} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  {portalError && <PortalErrorBox error={portalError} />}

                  <Button type="submit" className="w-full" disabled={otpSubmitting}>
                    {otpSubmitting ? "Verifying…" : "Verify & sign in"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStage("request");
                      setOtpCode("");
                      setPortalError(null);
                    }}
                    className="block w-full text-center text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  >
                    Use a different email
                  </button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Accounts are created by your administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function PortalErrorBox({
  error,
}: {
  error: { message: string; redirectUrl?: string };
}) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
      <p className="text-foreground">{error.message}</p>
      {error.redirectUrl && (
        <a
          href={error.redirectUrl}
          className="mt-2 inline-block font-medium text-destructive underline-offset-4 hover:underline"
        >
          Go to the correct portal →
        </a>
      )}
    </div>
  );
}