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
  getPatientClinical,
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
  adminSelect,
  adminSectionTitle,
  adminSectionSubtitle,
  adminCard,
  adminBtnPrimary,
  adminBtnSecondary,
} from "@/lib/admin-ui";
import { US_STATES } from "@/lib/us-states";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/patients/$patientId")({
  head: () => ({
    meta: [
      { title: "Patient details · Body Inc Admin" },
      { name: "description", content: "Patient details — Admin area of the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PatientDetailPage,
});

function PatientDetailPage() {
  const { patientId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getPatient);
  const getRelated = useServerFn(getPatientRelated);
  const getClinical = useServerFn(getPatientClinical);
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

  const clinical = useQuery({
    queryKey: ["patients", patientId, "clinical"],
    queryFn: () => getClinical({ data: { userId: patientId } }),
    enabled: !!patient.data,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["patients", patientId] });
    qc.invalidateQueries({ queryKey: ["patients"] });
  };

  const updateMut = useMutation({
    mutationFn: (
      vars: Partial<{
        full_name: string;
        phone: string | null;
        dob: string | null;
        sex: "male" | "female" | "other" | null;
        street_address: string | null;
        apartment: string | null;
        city: string | null;
        state_code: string | null;
        postal_code: string | null;
        country: string | null;
      }>,
    ) => update({ data: { userId: patientId, ...vars } }),
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
      <div className="admin-page-shell font-['DM_Sans',sans-serif] text-[14px] font-medium text-[#3B4759]/60">
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
          className="h-9 px-2 text-[14px] font-medium text-[#3B4759] hover:bg-[#E8EEED] hover:text-[#3B4759]"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="text-[14px] font-semibold text-[#B8684B]">
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
        className="h-9 -ml-2 px-2 text-[14px] font-medium text-[#3B4759] hover:bg-[#E8EEED] hover:text-[#3B4759]"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to patients
      </Button>

      <Card className={adminCard}>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            {d.avatar_url ? (
              <img src={d.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#D5DEDD] text-sm font-semibold uppercase text-[#3B4759]">
                {(d.full_name || d.email || "?").slice(0, 2)}
              </div>
            )}
            <div className="min-w-0 space-y-1">
              <CardTitle className={adminSectionTitle}>
                {d.full_name || "Unnamed patient"}
              </CardTitle>
              <CardDescription className={adminSectionSubtitle}>{d.email}</CardDescription>
            </div>
          </div>
          <Badge
            className={`rounded-lg border border-transparent px-2.5 py-0.5 text-[12px] font-semibold normal-case tracking-normal shadow-none ${
              d.is_active
                ? "bg-[#6A9B9C] text-white hover:bg-[#6A9B9C]"
                : "bg-[#D5DEDD] text-[#3B4759] hover:bg-[#D5DEDD]"
            }`}
          >
            {d.is_active ? "Active" : "Deactivated"}
          </Badge>
        </CardHeader>
      </Card>

      <Tabs defaultValue="profile" className="space-y-4">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="h-auto w-max gap-1 rounded-[10px] border border-[#D5DEDD] bg-[#E8EEED] p-1">
            <TabsTrigger
              value="profile"
              className="rounded-[8px] px-3 py-2 text-[14px] font-medium text-[#3B4759] shadow-none data-[state=active]:bg-white data-[state=active]:text-[#3B4759] data-[state=active]:shadow-sm"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="intake"
              className="rounded-[8px] px-3 py-2 text-[14px] font-medium text-[#3B4759] shadow-none data-[state=active]:bg-white data-[state=active]:text-[#3B4759] data-[state=active]:shadow-sm"
            >
              Intake Sessions
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="rounded-[8px] px-3 py-2 text-[14px] font-medium text-[#3B4759] shadow-none data-[state=active]:bg-white data-[state=active]:text-[#3B4759] data-[state=active]:shadow-sm"
            >
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="rounded-[8px] px-3 py-2 text-[14px] font-medium text-[#3B4759] shadow-none data-[state=active]:bg-white data-[state=active]:text-[#3B4759] data-[state=active]:shadow-sm"
            >
              Payments
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="rounded-[8px] px-3 py-2 text-[14px] font-medium text-[#3B4759] shadow-none data-[state=active]:bg-white data-[state=active]:text-[#3B4759] data-[state=active]:shadow-sm"
            >
              Account
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-0 space-y-4">
          <ClinicalSummaryCard data={clinical.data} loading={clinical.isLoading} />
          <ProfileTab
            defaultValues={{
              full_name: d.full_name ?? "",
              phone: d.phone ?? "",
              dob: d.dob ?? "",
              sex: d.sex ?? "",
            }}
            submitting={updateMut.isPending}
            onSubmit={(vals) =>
              updateMut.mutate({
                full_name: vals.full_name,
                phone: vals.phone || null,
                dob: vals.dob || null,
                sex: vals.sex || null,
              })
            }
          />
          <AddressCard
            defaultValues={{
              street_address: d.street_address ?? "",
              apartment: d.apartment ?? "",
              city: d.city ?? "",
              state_code: d.state_code ?? "",
              postal_code: d.postal_code ?? "",
              country: d.country ?? "",
            }}
            smsConsent={!!d.sms_consent}
            marketingConsent={!!d.marketing_consent}
            submitting={updateMut.isPending}
            onSubmit={(vals) => updateMut.mutate(vals)}
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
                <TableHeader className="bg-[#F8FBFA]">
                  <TableRow className="border-b border-[#D5DEDD] hover:bg-transparent">
                    <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                      Session
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                      Status
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                      Created
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(related.data?.sessions ?? []).map((s: any) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer border-b border-[#D5DEDD] transition-colors hover:bg-[#E8EEED]/40"
                      onClick={() =>
                        navigate({
                          to: "/admin/intake-sessions/$sessionId",
                          params: { sessionId: s.id },
                        })
                      }
                    >
                      <TableCell>
                        <div className="text-[14px] font-semibold text-[#3B4759]">
                          {s.full_name || "—"}
                        </div>
                        <div className="text-[12px] font-medium text-[#3B4759]/60">
                          {s.email || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="rounded-lg border border-transparent bg-[#D5DEDD] px-2.5 py-0.5 text-[12px] font-semibold text-[#3B4759] shadow-none normal-case tracking-normal hover:bg-[#D5DEDD]">
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[14px] font-medium text-[#3B4759]/70">
                        {formatDateTime(s.created_at)}
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
                <TableHeader className="bg-[#F8FBFA]">
                  <TableRow className="border-b border-[#D5DEDD] hover:bg-transparent">
                    <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                      Order
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                      Plan
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                      Total
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                      Status
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                      Created
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(related.data?.orders ?? []).map((o: any) => (
                    <TableRow
                      key={o.id}
                      className="cursor-pointer border-b border-[#D5DEDD] transition-colors hover:bg-[#E8EEED]/40"
                      onClick={() =>
                        navigate({ to: "/admin/orders/$orderId", params: { orderId: o.id } })
                      }
                    >
                      <TableCell className="font-mono text-xs font-medium text-[#3B4759]">
                        {o.id.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="text-[14px] font-medium text-[#3B4759]/70">
                        {o.selected_plan_code || "—"}
                      </TableCell>
                      <TableCell className="text-[14px] font-medium text-[#3B4759]">
                        ${Number(o.total ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className="rounded-lg border border-transparent bg-[#D5DEDD] px-2.5 py-0.5 text-[12px] font-semibold text-[#3B4759] shadow-none normal-case tracking-normal hover:bg-[#D5DEDD]">
                          {o.status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[14px] font-medium text-[#3B4759]/70">
                        {formatDateTime(o.created_at)}
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
                <TableHeader className="bg-[#F8FBFA]">
                  <TableRow className="border-b border-[#D5DEDD] hover:bg-transparent">
                    <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                      Amount
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                      Status
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                      Payment intent
                    </TableHead>
                    <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                      Created
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(related.data?.payments ?? []).map((p: any) => (
                    <TableRow
                      key={p.id}
                      className="border-b border-[#D5DEDD] transition-colors hover:bg-[#E8EEED]/40"
                    >
                      <TableCell className="text-[14px] font-medium text-[#3B4759]">
                        ${((p.amount_cents ?? 0) / 100).toFixed(2)} {p.currency?.toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <Badge className="rounded-lg border border-transparent bg-[#D5DEDD] px-2.5 py-0.5 text-[12px] font-semibold text-[#3B4759] shadow-none normal-case tracking-normal hover:bg-[#D5DEDD]">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium text-[#3B4759]">
                        {p.stripe_payment_intent_id ?? "—"}
                      </TableCell>
                      <TableCell className="text-[14px] font-medium text-[#3B4759]/70">
                        {formatDateTime(p.created_at)}
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
                  <div className="text-[13px] font-medium text-[#3B4759]/60">Email confirmed</div>
                  <div className="font-medium text-[#3B4759]">
                    {formatDateTime(d.email_confirmed_at)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[13px] font-medium text-[#3B4759]/60">Last sign-in</div>
                  <div className="font-medium text-[#3B4759]">
                    {formatDateTime(d.last_sign_in_at)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[13px] font-medium text-[#3B4759]/60">Joined</div>
                  <div className="font-medium text-[#3B4759]">{formatDateTime(d.created_at)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[13px] font-medium text-[#3B4759]/60">Profile updated</div>
                  <div className="font-medium text-[#3B4759]">{formatDateTime(d.updated_at)}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-[10px] border border-[#D5DEDD] bg-[#F8FBFA] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[16px] font-medium text-[#3B4759]">Account active</div>
                  <div className="mt-1 text-[13px] font-normal text-[#3B4759]/70">
                    Deactivating blocks sign-in for this patient.
                  </div>
                </div>
                <Switch
                  checked={d.is_active}
                  disabled={activeMut.isPending}
                  onCheckedChange={(checked) => activeMut.mutate(checked)}
                  className="data-[state=checked]:bg-[#6A9B9C]"
                />
              </div>

              <div className="flex flex-col gap-3 rounded-[10px] border border-[#D5DEDD] bg-[#F8FBFA] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[16px] font-medium text-[#3B4759]">Password reset</div>
                  <div className="mt-1 text-[13px] font-normal text-[#3B4759]/70">
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
  defaultValues: { full_name: string; phone: string; dob: string; sex: string };
  submitting: boolean;
  onSubmit: (v: {
    full_name: string;
    phone: string;
    dob: string;
    sex: "male" | "female" | "other" | null;
  }) => void;
}) {
  const [full_name, setFullName] = useState(defaultValues.full_name);
  const [phone, setPhone] = useState(defaultValues.phone);
  const [dob, setDob] = useState(defaultValues.dob);
  const [sex, setSex] = useState(defaultValues.sex);

  useEffect(() => {
    setFullName(defaultValues.full_name);
    setPhone(defaultValues.phone);
    setDob(defaultValues.dob);
    setSex(defaultValues.sex);
  }, [defaultValues.full_name, defaultValues.phone, defaultValues.dob, defaultValues.sex]);

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
            onSubmit({
              full_name: full_name.trim(),
              phone: phone.trim(),
              dob,
              sex: (sex || null) as "male" | "female" | "other" | null,
            });
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
            <div className="space-y-2">
              <Label htmlFor="sex" className={adminLabel}>
                Sex
              </Label>
              <select
                id="sex"
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className={adminSelect}
              >
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
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

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[12px] font-medium text-[#3B4759]/60">{label}</div>
      <div className="text-[14px] font-semibold text-[#3B4759]">{value}</div>
    </div>
  );
}

function ClinicalSummaryCard({ data, loading }: { data: any; loading: boolean }) {
  const planLabel = data?.plan
    ? [
        data.plan.name,
        data.plan.price != null
          ? `$${Number(data.plan.price).toFixed(2)}/${
              data.plan.duration_months === 1 ? "mo" : `${data.plan.duration_months} mo`
            }`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "—";

  const eligibilityBadge = data?.eligibility ? (
    <Badge
      className={`rounded-lg border border-transparent px-2.5 py-0.5 text-[12px] font-semibold normal-case tracking-normal shadow-none ${
        data.eligibility === "eligible"
          ? "bg-[#6A9B9C] text-white hover:bg-[#6A9B9C]"
          : "bg-[#F6E4DA] text-[#B8684B] hover:bg-[#F6E4DA]"
      }`}
    >
      {data.eligibility}
    </Badge>
  ) : (
    "—"
  );

  return (
    <Card className={adminCard}>
      <CardHeader className="space-y-1.5 p-4 sm:p-6">
        <CardTitle className={adminSectionTitle}>Clinical summary</CardTitle>
        <CardDescription className={adminSectionSubtitle}>
          From the patient&apos;s onboarding intake and current subscription.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {loading ? (
          <div className="text-[14px] font-medium text-[#3B4759]/60">Loading…</div>
        ) : !data?.has_data ? (
          <div className="text-[14px] font-medium text-[#3B4759]/60">No clinical data on file.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="BMI" value={data.bmi != null ? String(data.bmi) : "—"} />
            <Metric label="Goal" value={data.goal || "—"} />
            <Metric label="Eligibility" value={eligibilityBadge} />
            <Metric label="Current medicine" value={data.medicine_name || "—"} />
            <Metric label="Current plan" value={planLabel} />
            <Metric
              label="Subscription"
              value={<span className="capitalize">{data.subscription_status || "—"}</span>}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddressCard({
  defaultValues,
  smsConsent,
  marketingConsent,
  submitting,
  onSubmit,
}: {
  defaultValues: {
    street_address: string;
    apartment: string;
    city: string;
    state_code: string;
    postal_code: string;
    country: string;
  };
  smsConsent: boolean;
  marketingConsent: boolean;
  submitting: boolean;
  onSubmit: (v: {
    street_address: string | null;
    apartment: string | null;
    city: string | null;
    state_code: string | null;
    postal_code: string | null;
    country: string | null;
  }) => void;
}) {
  const [form, setForm] = useState(defaultValues);

  useEffect(() => {
    setForm({
      street_address: defaultValues.street_address,
      apartment: defaultValues.apartment,
      city: defaultValues.city,
      state_code: defaultValues.state_code,
      postal_code: defaultValues.postal_code,
      country: defaultValues.country,
    });
  }, [
    defaultValues.street_address,
    defaultValues.apartment,
    defaultValues.city,
    defaultValues.state_code,
    defaultValues.postal_code,
    defaultValues.country,
  ]);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const consentBadge = (label: string, on: boolean) => (
    <Badge
      className={`rounded-lg border border-transparent px-2.5 py-0.5 text-[12px] font-semibold normal-case tracking-normal shadow-none ${
        on
          ? "bg-[#6A9B9C] text-white hover:bg-[#6A9B9C]"
          : "bg-[#D5DEDD] text-[#3B4759] hover:bg-[#D5DEDD]"
      }`}
    >
      {label}: {on ? "Yes" : "No"}
    </Badge>
  );

  return (
    <Card className={adminCard}>
      <CardHeader className="space-y-1.5 p-4 sm:p-6">
        <CardTitle className={adminSectionTitle}>Shipping address</CardTitle>
        <CardDescription className={adminSectionSubtitle}>
          Delivery address captured during onboarding. Edits update the patient&apos;s profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              street_address: form.street_address.trim() || null,
              apartment: form.apartment.trim() || null,
              city: form.city.trim() || null,
              state_code: form.state_code || null,
              postal_code: form.postal_code.trim() || null,
              country: form.country.trim() || null,
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="street_address" className={adminLabel}>
                Street address
              </Label>
              <Input
                id="street_address"
                value={form.street_address}
                onChange={(e) => set("street_address", e.target.value)}
                className={adminInput}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apartment" className={adminLabel}>
                Apartment
              </Label>
              <Input
                id="apartment"
                value={form.apartment}
                onChange={(e) => set("apartment", e.target.value)}
                className={adminInput}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className={adminLabel}>
                City
              </Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className={adminInput}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state_code" className={adminLabel}>
                State
              </Label>
              <select
                id="state_code"
                value={form.state_code}
                onChange={(e) => set("state_code", e.target.value)}
                className={adminSelect}
              >
                <option value="">Not specified</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code" className={adminLabel}>
                ZIP code
              </Label>
              <Input
                id="postal_code"
                value={form.postal_code}
                onChange={(e) => set("postal_code", e.target.value)}
                className={adminInput}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="country" className={adminLabel}>
                Country
              </Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                className={adminInput}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {consentBadge("SMS consent", smsConsent)}
            {consentBadge("Marketing", marketingConsent)}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting} className={adminBtnPrimary}>
              {submitting ? "Saving…" : "Save address"}
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
          <div className="p-6 text-[14px] font-medium text-[#3B4759]/60">Loading…</div>
        ) : error ? (
          <div className="p-6 text-[14px] font-semibold text-[#B8684B]">{error.message}</div>
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
    <div className="flex flex-col gap-3 rounded-[10px] border border-[#B8684B]/40 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-[16px] font-medium text-[#B8684B]">Deactivate account</div>
        <div className="mt-1 text-[13px] font-normal text-[#3B4759]/70">
          Blocks {name} from signing in. Can be reversed.
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-10 rounded-[8px] border border-[#B8684B]/40 px-4 text-[13px] font-semibold text-[#B8684B] shadow-none hover:bg-[#FBF1EC] hover:text-[#B8684B]"
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
