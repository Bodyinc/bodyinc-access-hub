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
  sendPatientPasswordReset,
  setPatientActive,
  updatePatientProfile,
} from "@/lib/patients.functions";

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
  const update = useServerFn(updatePatientProfile);
  const setActive = useServerFn(setPatientActive);
  const reset = useServerFn(sendPatientPasswordReset);

  const patient = useQuery({
    queryKey: ["patients", patientId],
    queryFn: () => get({ data: { userId: patientId } }),
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
    return <div className="text-sm text-muted-foreground">Loading patient…</div>;
  }
  if (patient.isError || !patient.data) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/patients" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="text-sm text-destructive">
          {(patient.error as Error)?.message ?? "Patient not found"}
        </div>
      </div>
    );
  }

  const d = patient.data as any;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/patients" })}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to patients
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex items-center gap-3">
            {d.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-medium uppercase">
                {(d.full_name || d.email || "?").slice(0, 2)}
              </div>
            )}
            <div>
              <CardTitle>{d.full_name || "Unnamed patient"}</CardTitle>
              <CardDescription>{d.email}</CardDescription>
            </div>
          </div>
          <Badge variant={d.is_active ? "default" : "secondary"}>
            {d.is_active ? "Active" : "Deactivated"}
          </Badge>
        </CardHeader>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
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

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
              <CardDescription>Authentication metadata and admin actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground">Email confirmed</div>
                  <div>{formatDate(d.email_confirmed_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Last sign-in</div>
                  <div>{formatDate(d.last_sign_in_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Joined</div>
                  <div>{formatDate(d.created_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Profile updated</div>
                  <div>{formatDate(d.updated_at)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">Account active</div>
                  <div className="text-xs text-muted-foreground">
                    Deactivating blocks sign-in for this patient.
                  </div>
                </div>
                <Switch
                  checked={d.is_active}
                  disabled={activeMut.isPending}
                  onCheckedChange={(checked) => activeMut.mutate(checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">Password reset</div>
                  <div className="text-xs text-muted-foreground">
                    Sends a recovery email to {d.email}.
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resetMut.isPending}
                  onClick={() => resetMut.mutate()}
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
        <CardDescription>Update the patient's contact details.</CardDescription>
      </CardHeader>
      <CardContent>
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
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={full_name}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
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
    <div className="flex items-center justify-between rounded-md border border-destructive/40 p-3">
      <div>
        <div className="font-medium text-destructive">Deactivate account</div>
        <div className="text-xs text-muted-foreground">
          Blocks {name} from signing in. Can be reversed.
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled}>
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