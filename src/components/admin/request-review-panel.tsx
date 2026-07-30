import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Check, FileText, Repeat, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getRequest,
  approveRequest,
  rejectRequest,
  generatePrescription,
  advanceRequestStatus,
  assignRequestProvider,
} from "@/lib/requests.functions";
import { listProviders } from "@/lib/providers.functions";
import { claimRequest } from "@/lib/provider.functions";
import {
  requestStatusLabel,
  requestStatusTone,
  REQUEST_STATUS_BADGE,
  nextFulfillmentStep,
} from "@/lib/request-status";
import { adminSectionTitle, adminSectionSubtitle, adminCard } from "@/lib/admin-ui";
import { RequestChangeMedicineDialog } from "@/components/admin/request-change-medicine-dialog";
import { RequestNotes } from "@/components/admin/request-notes";
import { formatCents, formatDateTimeFull } from "@/lib/format";

export function RequestReviewPanel({
  requestId,
  backTo,
  canManage = false,
  clinicalOnly = false,
  canClaim = false,
}: {
  requestId: string;
  backTo: string;
  canManage?: boolean;
  /** Practitioner view: hide patient contact / billing details. */
  clinicalOnly?: boolean;
  /** Practitioner view: allow claiming an unassigned order. */
  canClaim?: boolean;
}) {
  const qc = useQueryClient();
  const get = useServerFn(getRequest);
  const approve = useServerFn(approveRequest);
  const reject = useServerFn(rejectRequest);
  const generate = useServerFn(generatePrescription);
  const advance = useServerFn(advanceRequestStatus);
  const assign = useServerFn(assignRequestProvider);
  const listProv = useServerFn(listProviders);
  const claim = useServerFn(claimRequest);

  const q = useQuery({
    queryKey: ["request", requestId],
    queryFn: () => get({ data: { requestId } }),
  });

  const providersQ = useQuery({
    queryKey: ["assignable-providers"],
    queryFn: () => listProv({ data: { status: "active" } }),
    enabled: canManage,
  });

  const [changeOpen, setChangeOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [rxOpen, setRxOpen] = useState(false);
  const [directions, setDirections] = useState("");
  const [trackOpen, setTrackOpen] = useState(false);
  const [tracking, setTracking] = useState("");
  const [assignId, setAssignId] = useState("");

  const assignMut = useMutation({
    mutationFn: () => assign({ data: { requestId, providerId: assignId || null } }),
    onSuccess: () => {
      toast.success("Provider assigned.");
      setAssignId("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const claimMut = useMutation({
    mutationFn: () => claim({ data: { requestId } }),
    onSuccess: () => {
      toast.success("Order claimed — it's now assigned to you.");
      qc.invalidateQueries({ queryKey: ["provider-claimable"] });
      qc.invalidateQueries({ queryKey: ["provider-dashboard"] });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["request", requestId] });
    qc.invalidateQueries({ queryKey: ["requests"] });
  }

  const approveMut = useMutation({
    mutationFn: () => approve({ data: { requestId } }),
    onSuccess: () => {
      toast.success("Order approved.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMut = useMutation({
    mutationFn: () => reject({ data: { requestId, note: rejectNote || undefined } }),
    onSuccess: () => {
      toast.success("Order rejected and refunded.");
      setRejectOpen(false);
      setRejectNote("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateMut = useMutation({
    mutationFn: () => generate({ data: { requestId, directions: directions || undefined } }),
    onSuccess: () => {
      toast.success("Prescription generated.");
      setRxOpen(false);
      setDirections("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const advanceMut = useMutation({
    mutationFn: (vars: {
      status: "sent_to_pharmacy" | "dispatched" | "delivered";
      trackingNumber?: string;
    }) => advance({ data: { requestId, ...vars } }),
    onSuccess: () => {
      toast.success("Status updated.");
      setTrackOpen(false);
      setTracking("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) {
    return (
      <div className="admin-page-shell font-['DM_Sans',sans-serif] text-[14px] font-medium text-[#3B4759]/60">
        Loading order…
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="admin-page-shell space-y-3 font-['DM_Sans',sans-serif]">
        <Link
          to={backTo}
          className="inline-flex items-center text-[14px] font-medium text-[#3B4759]"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Link>
        <div className="text-[14px] font-semibold text-[#B8684B]">
          {(q.error as Error)?.message ?? "Order not found"}
        </div>
      </div>
    );
  }

  const {
    request,
    patient,
    medicine,
    package: pkg,
    provider,
    events,
    prescriptions,
    additional_payments,
  } = q.data as any;

  const status: string = request.status;
  const canApprove = status === "pending_review";
  const canReject = status === "pending_review" || status === "awaiting_additional_payment";
  const canChange = ["pending_review", "approved", "awaiting_additional_payment"].includes(status);
  const canGenerate = status === "approved";
  const nextStep = nextFulfillmentStep(status);

  return (
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans',sans-serif]">
      <Link
        to={backTo}
        className="inline-flex h-9 items-center -ml-1 px-1 text-[14px] font-medium text-[#3B4759] hover:opacity-80"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to orders
      </Link>

      <Card className={adminCard}>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-4 sm:p-6">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className={`${adminSectionTitle} font-mono text-[15px] sm:text-[17px]`}>
              {request.id}
            </CardTitle>
            <CardDescription className={adminSectionSubtitle}>
              {request.kind === "followup" ? "Renewal order" : "Initial order"} ·{" "}
              {formatDateTimeFull(request.created_at)}
            </CardDescription>
          </div>
          <Badge
            className={`rounded-lg border border-transparent px-2.5 py-0.5 text-[12px] font-semibold normal-case tracking-normal shadow-none ${
              REQUEST_STATUS_BADGE[requestStatusTone(status)]
            }`}
          >
            {requestStatusLabel(status)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="grid gap-4 text-[14px] sm:grid-cols-2">
            <Row
              label="Patient"
              value={patient?.name ?? (patient?.is_guest ? "Guest — no account yet" : "—")}
            />
            {clinicalOnly ? null : <Row label="Email" value={patient?.email ?? "—"} />}
            <Row label="State" value={patient?.state_code ?? "—"} />
            <Row label="Assigned provider" value={provider?.full_name ?? "Unassigned"} />
            <Row label="Medication" value={medicine?.name ?? "—"} />
            <Row label="Plan" value={pkg?.name ?? "—"} />
            {clinicalOnly ? null : (
              <Row
                label="Plan price"
                value={pkg?.price != null ? `$${Number(pkg.price).toFixed(2)}` : "—"}
              />
            )}
            <Row
              label="Needs approval"
              value={request.requires_consultation ? "Yes" : "No (auto)"}
            />
            {request.tracking_number ? (
              <Row label="Tracking #" value={request.tracking_number} />
            ) : null}
          </div>

          {canManage ? (
            <div className="flex flex-wrap items-end gap-2 border-t border-[#D5DEDD] pt-4">
              <div className="min-w-[220px] space-y-1">
                <div className="text-[13px] font-medium text-[#3B4759]/60">
                  Assign / reassign provider
                </div>
                <Select value={assignId} onValueChange={setAssignId}>
                  <SelectTrigger className="h-10 border-[#D5DEDD] text-[13px] text-[#3B4759]">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent className="font-['DM_Sans',sans-serif]">
                    {((providersQ.data as any[]) ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-[14px] text-[#3B4759]">
                        {p.full_name}
                        {p.is_default ? " (default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!assignId || assignMut.isPending}
                onClick={() => assignMut.mutate()}
                className="h-10 border-[#D5DEDD] px-4 text-[13px] font-semibold text-[#3B4759]"
              >
                Assign
              </Button>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 border-t border-[#D5DEDD] pt-4">
            {canClaim && !provider ? (
              <Button
                size="sm"
                onClick={() => claimMut.mutate()}
                disabled={claimMut.isPending}
                className="h-10 bg-[#6A9B9C] px-4 text-[13px] font-semibold text-white hover:bg-[#5B8788]"
              >
                {claimMut.isPending ? "Claiming…" : "Claim this order"}
              </Button>
            ) : null}
            {canApprove ? (
              <Button
                size="sm"
                onClick={() => approveMut.mutate()}
                disabled={approveMut.isPending}
                className="h-10 bg-[#6A9B9C] px-4 text-[13px] font-semibold text-white hover:bg-[#5B8788]"
              >
                <Check className="mr-1 h-4 w-4" /> Approve
              </Button>
            ) : null}
            {canChange ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setChangeOpen(true)}
                className="h-10 border-[#D5DEDD] px-4 text-[13px] font-semibold text-[#3B4759]"
              >
                <Repeat className="mr-1 h-4 w-4" /> Change medicine
              </Button>
            ) : null}
            {canGenerate ? (
              <Button
                size="sm"
                onClick={() => setRxOpen(true)}
                className="h-10 bg-[#6A9B9C] px-4 text-[13px] font-semibold text-white hover:bg-[#5B8788]"
              >
                <FileText className="mr-1 h-4 w-4" /> Generate prescription
              </Button>
            ) : null}
            {nextStep ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  nextStep.status === "dispatched"
                    ? setTrackOpen(true)
                    : advanceMut.mutate({ status: nextStep.status })
                }
                disabled={advanceMut.isPending}
                className="h-10 border-[#D5DEDD] px-4 text-[13px] font-semibold text-[#3B4759]"
              >
                <Truck className="mr-1 h-4 w-4" /> {nextStep.label}
              </Button>
            ) : null}
            {canReject ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectOpen(true)}
                className="h-10 border-[#E7CFC3] px-4 text-[13px] font-semibold text-[#8F4A33] hover:bg-[#F6E4DA]"
              >
                <X className="mr-1 h-4 w-4" /> Reject &amp; refund
              </Button>
            ) : null}
          </div>

          {status === "awaiting_additional_payment" ? (
            <p className="rounded-lg bg-[#FFF4E5] px-3 py-2 text-[13px] font-medium text-[#B45309]">
              Waiting for the patient to pay the price difference. The prescription can be generated
              once payment succeeds.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {additional_payments.length > 0 ? (
        <Card className={adminCard}>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className={adminSectionTitle}>Additional payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0 text-[14px] sm:p-6 sm:pt-0">
            {additional_payments.map((ap: any) => (
              <div key={ap.id} className="flex items-center justify-between gap-3">
                <span className="text-[#3B4759]">
                  {formatCents(ap.amount_cents)} — {ap.reason ?? "Price difference"}
                </span>
                <Badge
                  className={`rounded-lg border border-transparent px-2.5 py-0.5 text-[12px] font-semibold normal-case shadow-none ${
                    ap.status === "paid"
                      ? "bg-[#6A9B9C] text-white hover:bg-[#6A9B9C]"
                      : "bg-[#FFF4E5] text-[#B45309] hover:bg-[#FFF4E5]"
                  }`}
                >
                  {ap.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {prescriptions.length > 0 ? (
        <Card className={adminCard}>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className={adminSectionTitle}>Prescription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 text-[14px] sm:p-6 sm:pt-0">
            {prescriptions.map((rx: any) => (
              <div key={rx.id} className="space-y-1 rounded-lg border border-[#D5DEDD] p-3">
                <div className="font-semibold text-[#3B4759]">{rx.medicine_name}</div>
                {rx.directions ? (
                  <div className="text-[#3B4759]/80">{rx.directions}</div>
                ) : (
                  <div className="text-[#3B4759]/50">Directions to be added from the template.</div>
                )}
                <div className="text-[12px] text-[#3B4759]/60">
                  {rx.status} · {formatDateTimeFull(rx.created_at)}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    to="/rx/$prescriptionId"
                    params={{ prescriptionId: rx.id }}
                    search={{ download: false }}
                    target="_blank"
                    className="rounded-md border border-[#6A9B9C] px-3 py-1.5 text-[13px] font-semibold text-[#3B4759] hover:bg-[#E8EEED]"
                  >
                    View
                  </Link>
                  <Link
                    to="/rx/$prescriptionId"
                    params={{ prescriptionId: rx.id }}
                    search={{ download: true }}
                    target="_blank"
                    className="rounded-md bg-[#6A9B9C] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#5B8788]"
                  >
                    Download
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <RequestNotes requestId={requestId} />

      <Card className={adminCard}>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className={adminSectionTitle}>Status history</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <ol className="space-y-3">
            {events.map((ev: any) => (
              <li key={ev.id} className="flex gap-3 text-[14px]">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#6A9B9C]" />
                <div className="min-w-0">
                  <div className="font-medium text-[#3B4759]">{requestStatusLabel(ev.status)}</div>
                  <div className="text-[12px] text-[#3B4759]/60">
                    {ev.actor_role} · {formatDateTimeFull(ev.created_at)}
                  </div>
                  {ev.note ? <div className="text-[13px] text-[#3B4759]/80">{ev.note}</div> : null}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <RequestChangeMedicineDialog
        requestId={requestId}
        open={changeOpen}
        onOpenChange={setChangeOpen}
        onChanged={refresh}
        currentMedicineId={medicine?.id ?? request.medicine_id ?? null}
        current={{
          medicineName: medicine?.name ?? null,
          planName: pkg?.name ?? null,
          price: pkg?.price != null ? Number(pkg.price) : null,
        }}
      />

      {/* Reject */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject &amp; refund</DialogTitle>
            <DialogDescription>
              This refunds the patient&apos;s payment, cancels the subscription, and closes the
              order. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <label className="text-[13px] font-medium text-[#3B4759]">Reason (optional)</label>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Why is this being rejected?"
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => rejectMut.mutate()}
              disabled={rejectMut.isPending}
              className="bg-[#8F4A33] text-white hover:bg-[#8F4A33]"
            >
              {rejectMut.isPending ? "Rejecting…" : "Reject & refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate prescription */}
      <Dialog open={rxOpen} onOpenChange={setRxOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate prescription</DialogTitle>
            <DialogDescription>
              Creates the prescription for {medicine?.name ?? "this medication"}, visible to the
              patient, provider, and admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <label className="text-[13px] font-medium text-[#3B4759]">Directions (optional)</label>
            <Textarea
              value={directions}
              onChange={(e) => setDirections(e.target.value)}
              placeholder="Dosage and sig instructions"
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRxOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
              {generateMut.isPending ? "Generating…" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispatch tracking number */}
      <Dialog open={trackOpen} onOpenChange={setTrackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark dispatched</DialogTitle>
            <DialogDescription>Enter the shipment tracking number, if available.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <label className="text-[13px] font-medium text-[#3B4759]">Tracking number</label>
            <Input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="e.g. 1Z999AA10123456784"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                advanceMut.mutate({ status: "dispatched", trackingNumber: tracking || undefined })
              }
              disabled={advanceMut.isPending}
            >
              {advanceMut.isPending ? "Saving…" : "Mark dispatched"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[13px] font-medium text-[#3B4759]/60">{label}</div>
      <div className="text-[14px] font-medium text-[#3B4759]">{value}</div>
    </div>
  );
}
