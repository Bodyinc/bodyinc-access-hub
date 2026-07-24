import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getPatient,
  getPatientRelated,
  sendPatientPasswordReset,
  setPatientActive,
  updatePatientProfile,
} from "@/lib/patients.functions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminLabel,
  adminInput,
  adminSectionTitle,
  adminSectionSubtitle,
  adminCard,
  adminBtnPrimary,
  adminBtnSecondary,
} from "@/lib/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/patients/$patientId")({
  component: PatientDetailPage,
});

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PatientDetailPage() {
  const { patientId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getPatient);
  const getRelated = useServerFn(getPatientRelated);
  const update = useServerFn(updatePatientProfile);
  const setActive = useServerFn(setPatientActive);
  const reset = useServerFn(sendPatientPasswordReset);

  const patient = useQuery({
    queryKey: ["patients", patientId],
    queryFn: () => get({ data: { userId: patientId } }),
  });

  const related = useQuery({
    queryKey: ["patients", patientId, "related"],
    queryFn: () => getRelated({ data: { userId: patientId } }),
    enabled: !!patient.data,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["patients", patientId] });
    qc.invalidateQueries({ queryKey: ["patients"] });
  };

  const updateMut = useMutation({
    mutationFn: (vars: { full_name: string; phone: string | null; dob: string | null }) =>
      update({ data: { userId: patientId, ...vars } }),
    onSuccess: () => {
      invalidate();
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMut = useMutation({
    mutationFn: (is_active: boolean) => setActive({ data: { userId: patientId, is_active } }),
    onSuccess: () => {
      invalidate();
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: () =>
      reset({
        data: { userId: patientId, redirect_to: `${window.location.origin}/reset-password` },
      }),
    onSuccess: () => toast.success("Password reset email sent"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (patient.isLoading) {
    return (
      <div className="admin-page-shell font-['DM_Sans',sans-serif] text-[14px] font-medium text-[#2E00AB]/60">
        Loading patient…
      </div>
    );
  }
  if (patient.isError || !patient.data) {
    return (
      <div className="admin-page-shell space-y-3 font-['DM_Sans',sans-serif]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/admin/patients" })}
          className="h-9 px-2 text-[14px] font-medium text-[#2E00AB] hover:bg-[#F5F3FF] hover:text-[#2E00AB]"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="text-[14px] font-semibold text-[#FF4D6D]">
          {(patient.error as Error)?.message ?? "Patient not found"}
        </div>
      </div>
    );
  }

  const d = patient.data as any;

  return (
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans',sans-serif]">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/admin/patients" })}
        className="h-9 -ml-2 px-2 text-[14px] font-medium text-[#2E00AB] hover:bg-[#F5F3FF] hover:text-[#2E00AB]"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to patients
      </Button>

      <Card className={adminCard}>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            {d.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAE6FA] text-sm font-semibold uppercase text-[#2E00AB]">
                {(d.full_name || d.email || "?").slice(0, 2)}
              </div>
            )}
            <div className="min-w-0 space-y-1">
              <CardTitle className={adminSectionTitle}>{d.full_name || "Unnamed patient"}</CardTitle>
              <CardDescription className={adminSectionSubtitle}>{d.email}</CardDescription>
            </div>
          </div>
          <Badge
            className={`rounded-lg border border-transparent px-2.5 py-0.5 text-[12px] font-semibold normal-case tracking-normal shadow-none ${
              d.is_active
                ? "bg-[#2E00AB] text-white hover:bg-[#2E00AB]"
                : "bg-[#EAE6FA] text-[#2E00AB] hover:bg-[#EAE6FA]"
            }`}
          >
            {d.is_active ? "Active" : "Deactivated"}
          </Badge>
        </CardHeader>
      </Card>

      <Tabs defaultValue="profile" className="space-y-4">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="h-auto w-max gap-1 rounded-[10px] border border-[#EAE6FA] bg-[#F5F3FF] p-1">
            <TabsTrigger
              value="profile"
              className="rounded-[8px] px-3 py-2 text-[14px] font-medium text-[#2E00AB] shadow-none data-[state=active]:bg-white data-[state=active]:text-[#2E00AB] data-[state=active]:shadow-sm"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="intake"
              className="rounded-[8px] px-3 py-2 text-[14px] font-medium text-[#2E00AB] shadow-none data-[state=active]:bg-white data-[state=active]:text-[#2E00AB] data-[state=active]:shadow-sm"
            >
              Intake Sessions
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="rounded-[8px] px-3 py-2 text-[14px] font-medium text-[#2E00AB] shadow-none data-[state=active]:bg-white data-[state=active]:text-[#2E00AB] data-[state=active]:shadow-sm"
            >
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="rounded-[8px] px-3 py-2 text-[14px] font-medium text-[#2E00AB] shadow-none data-[state=active]:bg-white data-[state=active]:text-[#2E00AB] data-[state=active]:shadow-sm"
            >
              Payments
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="rounded-[8px] px-3 py-2 text-[14px] font-medium text-[#2E00AB] shadow-none data-[state=active]:bg-white data-[state=active]:text-[#2E00AB] data-[state=active]:shadow-sm"
            >
              Account
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-0">
          <ProfileTab
            defaultValues={{
              full_name: d.full_name ?? "",
              phone: d.phone ?? "",
              dob: d.dob ?? "",
            }}
            submitting={updateMut.isPending}
            onSubmit={(vals) =>
              updateMut.mutate({
                full_name: vals.full_name,
                phone: vals.phone || null,
                dob: vals.dob || null,
              })
            }
          />
        </TabsContent>

        <TabsContent value="intake" className="mt-0">
          <RelatedList
            isLoading={related.isLoading}
            error={related.error as Error | null}
            empty="No intake sessions."
          >
            <div className="admin-table-scroll">
              <Table className="min-w-[520px]">
                <TableHeader className="bg-[#FDFDFF]">
                  <TableRow className="border-b border-[#EAE6FA] hover:bg-transparent">
                    <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">
                      Session
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">
                      Status
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">
                      Created
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(related.data?.sessions ?? []).map((s: any) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer border-b border-[#EAE6FA] transition-colors hover:bg-[#F5F3FF]/40"
                      onClick={() =>
                        navigate({
                          to: "/admin/intake-sessions/$sessionId",
                          params: { sessionId: s.id },
                        })
                      }
                    >
                      <TableCell>
                        <div className="text-[14px] font-semibold text-[#2E00AB]">
                          {s.full_name || "—"}
                        </div>
                        <div className="text-[12px] font-medium text-[#2E00AB]/60">
                          {s.email || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="rounded-lg border border-transparent bg-[#EAE6FA] px-2.5 py-0.5 text-[12px] font-semibold text-[#2E00AB] shadow-none normal-case tracking-normal hover:bg-[#EAE6FA]">
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[14px] font-medium text-[#2E00AB]/70">
                        {formatDate(s.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </RelatedList>
        </TabsContent>

        <TabsContent value="orders" className="mt-0">
          <RelatedList
            isLoading={related.isLoading}
            error={related.error as Error | null}
            empty="No orders."
          >
            <div className="admin-table-scroll">
              <Table className="min-w-[640px]">
                <TableHeader className="bg-[#FDFDFF]">
                  <TableRow className="border-b border-[#EAE6FA] hover:bg-transparent">
                    <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">
                      Order
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">
                      Plan
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">
                      Total
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">
                      Status
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">
                      Created
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(related.data?.orders ?? []).map((o: any) => (
                    <TableRow
                      key={o.id}
                      className="cursor-pointer border-b border-[#EAE6FA] transition-colors hover:bg-[#F5F3FF]/40"
                      onClick={() =>
                        navigate({ to: "/admin/orders/$orderId", params: { orderId: o.id } })
                      }
                    >
                      <TableCell className="font-mono text-xs font-medium text-[#2E00AB]">
                        {o.id.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="text-[14px] font-medium text-[#2E00AB]/70">
                        {o.selected_plan_code || "—"}
                      </TableCell>
                      <TableCell className="text-[14px] font-medium text-[#2E00AB]">
                        ${Number(o.total ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className="rounded-lg border border-transparent bg-[#EAE6FA] px-2.5 py-0.5 text-[12px] font-semibold text-[#2E00AB] shadow-none normal-case tracking-normal hover:bg-[#EAE6FA]">
                          {o.status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[14px] font-medium text-[#2E00AB]/70">
                        {formatDate(o.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </RelatedList>
        </TabsContent>

        <TabsContent value="payments" className="mt-0">
          <RelatedList
            isLoading={related.isLoading}
            error={related.error as Error | null}
            empty="No payments."
          >
            <div className="admin-table-scroll">
              <Table className="min-w-[600px]">
                <TableHeader className="bg-[#FDFDFF]">
                  <TableRow className="border-b border-[#EAE6FA] hover:bg-transparent">
                    <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">
                      Amount
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">
                      Status
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">
                      Payment intent
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">
                      Created
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(related.data?.payments ?? []).map((p: any) => (
                    <TableRow
                      key={p.id}
                      className="border-b border-[#EAE6FA] transition-colors hover:bg-[#F5F3FF]/40"
                    >
                      <TableCell className="text-[14px] font-medium text-[#2E00AB]">
                        ${((p.amount_cents ?? 0) / 100).toFixed(2)} {p.currency?.toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <Badge className="rounded-lg border border-transparent bg-[#EAE6FA] px-2.5 py-0.5 text-[12px] font-semibold text-[#2E00AB] shadow-none normal-case tracking-normal hover:bg-[#EAE6FA]">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium text-[#2E00AB]">
                        {p.stripe_payment_intent_id ?? "—"}
                      </TableCell>
                      <TableCell className="text-[14px] font-medium text-[#2E00AB]/70">
                        {formatDate(p.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </RelatedList>
        </TabsContent>

        <TabsContent value="account" className="mt-0">
          <Card className={adminCard}>
            <CardHeader className="space-y-1.5 p-4 sm:p-6">
              <CardTitle className={adminSectionTitle}>Account</CardTitle>
              <CardDescription className={adminSectionSubtitle}>
                Authentication metadata and admin actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0 text-[14px] sm:p-6 sm:pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-[13px] font-medium text-[#2E00AB]/60">Email confirmed</div>
                  <div className="font-medium text-[#2E00AB]">{formatDate(d.email_confirmed_at)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[13px] font-medium text-[#2E00AB]/60">Last sign-in</div>
                  <div className="font-medium text-[#2E00AB]">{formatDate(d.last_sign_in_at)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[13px] font-medium text-[#2E00AB]/60">Joined</div>
                  <div className="font-medium text-[#2E00AB]">{formatDate(d.created_at)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[13px] font-medium text-[#2E00AB]/60">Profile updated</div>
                  <div className="font-medium text-[#2E00AB]">{formatDate(d.updated_at)}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-[10px] border border-[#EAE6FA] bg-[#FDFDFF] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[16px] font-medium text-[#2E00AB]">Account active</div>
                  <div className="mt-1 text-[13px] font-normal text-[#2E00AB]/70">
                    Deactivating blocks sign-in for this patient.
                  </div>
                </div>
                <Switch
                  checked={d.is_active}
                  disabled={activeMut.isPending}
                  onCheckedChange={(checked) => activeMut.mutate(checked)}
                  className="data-[state=checked]:bg-[#2E00AB]"
                />
              </div>

              <div className="flex flex-col gap-3 rounded-[10px] border border-[#EAE6FA] bg-[#FDFDFF] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[16px] font-medium text-[#2E00AB]">Password reset</div>
                  <div className="mt-1 text-[13px] font-normal text-[#2E00AB]/70">
                    Sends a recovery email to {d.email}.
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resetMut.isPending}
                  onClick={() => resetMut.mutate()}
                  className={`${adminBtnSecondary} h-10 px-4 text-[13px]`}
                >
                  <Mail className="mr-1.5 h-4 w-4" /> Send reset email
                </Button>
              </div>

              <DangerZone
                isActive={d.is_active}
                name={d.full_name || d.email}
                disabled={activeMut.isPending}
                onConfirm={() => activeMut.mutate(false)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab({
  defaultValues,
  submitting,
  onSubmit,
}: {
  defaultValues: { full_name: string; phone: string; dob: string };
  submitting: boolean;
  onSubmit: (v: { full_name: string; phone: string; dob: string }) => void;
}) {
  const [full_name, setFullName] = useState(defaultValues.full_name);
  const [phone, setPhone] = useState(defaultValues.phone);
  const [dob, setDob] = useState(defaultValues.dob);

  useEffect(() => {
    setFullName(defaultValues.full_name);
    setPhone(defaultValues.phone);
    setDob(defaultValues.dob);
  }, [defaultValues.full_name, defaultValues.phone, defaultValues.dob]);

  return (
    <Card className={adminCard}>
      <CardHeader className="space-y-1.5 p-4 sm:p-6">
        <CardTitle className={adminSectionTitle}>Profile</CardTitle>
        <CardDescription className={adminSectionSubtitle}>
          Update the patient's contact details.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!full_name.trim()) {
              toast.error("Name is required");
              return;
            }
            onSubmit({ full_name: full_name.trim(), phone: phone.trim(), dob });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name" className={adminLabel}>
                Full name
              </Label>
              <Input
                id="full_name"
                value={full_name}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={adminInput}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className={adminLabel}>
                Phone
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={adminInput}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob" className={adminLabel}>
                Date of birth
              </Label>
              <Input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={adminInput}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting} className={adminBtnPrimary}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function RelatedList({
  isLoading,
  error,
  empty: _empty,
  children,
}: {
  isLoading: boolean;
  error: Error | null;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={adminCard}>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-[14px] font-medium text-[#2E00AB]/60">Loading…</div>
        ) : error ? (
          <div className="p-6 text-[14px] font-semibold text-[#FF4D6D]">{error.message}</div>
        ) : (
          <>{children}</>
        )}
      </CardContent>
    </Card>
  );
}

function DangerZone({
  isActive,
  name,
  disabled,
  onConfirm,
}: {
  isActive: boolean;
  name: string;
  disabled: boolean;
  onConfirm: () => void;
}) {
  if (!isActive) return null;
  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-[#FF4D6D]/40 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-[16px] font-medium text-[#FF4D6D]">Deactivate account</div>
        <div className="mt-1 text-[13px] font-normal text-[#2E00AB]/70">
          Blocks {name} from signing in. Can be reversed.
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-10 rounded-[8px] border border-[#FF4D6D]/40 px-4 text-[13px] font-semibold text-[#FF4D6D] shadow-none hover:bg-[#FFF5F7] hover:text-[#FF4D6D]"
          >
            Deactivate
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this patient?</AlertDialogTitle>
            <AlertDialogDescription>
              {name} will be unable to sign in until you reactivate the account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onConfirm}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
