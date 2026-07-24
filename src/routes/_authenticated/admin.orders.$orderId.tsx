import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Download, Eye, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangeMedicineDialog } from "@/components/admin/change-medicine-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOrder } from "@/lib/orders.functions";
import {
  adminSectionTitle,
  adminSectionSubtitle,
  adminCard,
  adminBtnSecondary,
} from "@/lib/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/orders/$orderId")({
  component: OrderDetailPage,
});

function formatCurrency(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n ?? 0),
  );
}
function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getOrder);
  const q = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: () => get({ data: { orderId } }),
  });
  const [changeOpen, setChangeOpen] = useState(false);

  if (q.isLoading) {
    return (
      <div className="admin-page-shell font-['DM_Sans',sans-serif] text-[14px] font-medium text-[#2E00AB]/60">
        Loading order…
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="admin-page-shell space-y-3 font-['DM_Sans',sans-serif]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/admin/orders" })}
          className="h-9 px-2 text-[14px] font-medium text-[#2E00AB] hover:bg-[#F5F3FF] hover:text-[#2E00AB]"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="text-[14px] font-semibold text-[#FF4D6D]">
          {(q.error as Error)?.message ?? "Order not found"}
        </div>
      </div>
    );
  }

  const { subscription, package: pkg, variant_name, medicine, customer, payments, display_status } =
    q.data as any;

  const canChangeMedicine = ["active", "trialing", "past_due"].includes(subscription.status);

  return (
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans',sans-serif]">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/admin/orders" })}
        className="h-9 -ml-2 px-2 text-[14px] font-medium text-[#2E00AB] hover:bg-[#F5F3FF] hover:text-[#2E00AB]"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to orders
      </Button>

      <Card className={adminCard}>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-4 sm:p-6">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className={`${adminSectionTitle} font-mono text-[16px] sm:text-[18px]`}>
              {subscription.id}
            </CardTitle>
            <CardDescription className={adminSectionSubtitle}>
              {formatDate(subscription.created_at)}
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {canChangeMedicine ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChangeOpen(true)}
                className={`${adminBtnSecondary} h-10 px-4 text-[13px]`}
              >
                <Repeat className="mr-1 h-4 w-4" /> Change medicine
              </Button>
            ) : null}
            <Badge
              className={`rounded-lg border border-transparent px-2.5 py-0.5 text-[12px] font-semibold normal-case tracking-normal shadow-none ${
                display_status === "paid"
                  ? "bg-[#2E00AB] text-white hover:bg-[#2E00AB]"
                  : "bg-[#EAE6FA] text-[#2E00AB] hover:bg-[#EAE6FA]"
              }`}
            >
              {display_status ?? "—"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-0 text-[14px] sm:grid-cols-2 sm:p-6 sm:pt-0">
          <Row label="Medication" value={medicine?.name ?? "—"} />
          <Row label="Variant" value={variant_name ?? "—"} />
          <Row label="Plan" value={pkg?.name ?? "—"} />
          <Row label="Plan price" value={pkg ? formatCurrency(pkg.price) : "—"} />
          <Row
            label="Billing cycle"
            value={pkg?.duration_months ? `Every ${pkg.duration_months} month(s)` : "—"}
          />
          <Row label="Renews on" value={formatDate(subscription.current_period_end)} />
          <Row label="Auto-renew" value={subscription.cancel_at_period_end ? "No (canceling)" : "Yes"} />
          <Row
            label="Stripe subscription"
            value={
              <span className="font-mono text-xs text-[#2E00AB]">
                {subscription.stripe_subscription_id ?? "—"}
              </span>
            }
          />
        </CardContent>
      </Card>

      <Card className={adminCard}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-6">
          <CardTitle className={adminSectionTitle}>Customer</CardTitle>
          {customer?.is_guest ? (
            <Badge
              className="rounded-lg border border-transparent bg-[#EAE6FA] px-2.5 py-0.5 text-[12px] font-semibold text-[#2E00AB] shadow-none normal-case tracking-normal hover:bg-[#EAE6FA]"
              title="Paid during onboarding; account not yet created"
            >
              Guest — no account yet
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0 text-[14px] sm:grid-cols-2 sm:p-6 sm:pt-0">
          {customer ? (
            <>
              <Row label="Name" value={customer.full_name || "—"} />
              <Row label="Email" value={customer.email || "—"} />
              <Row label="Phone" value={customer.phone || "—"} />
              <Row
                label="Address"
                value={
                  [
                    customer.street_address,
                    customer.city,
                    customer.state_code,
                    customer.postal_code,
                    customer.country,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                  (customer.is_guest ? "Captured after account setup" : "—")
                }
              />
            </>
          ) : (
            <div className="text-[#2E00AB]/60 font-medium">
              No customer on this subscription (no linked account or intake session).
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={adminCard}>
        <CardHeader className="space-y-1.5 p-4 sm:p-6">
          <CardTitle className={adminSectionTitle}>Payments</CardTitle>
          <CardDescription className={adminSectionSubtitle}>
            Charges recorded for this subscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="admin-table-scroll">
            <Table className="min-w-[560px]">
              <TableHeader className="bg-[#FDFDFF]">
                <TableRow className="border-b border-[#EAE6FA] hover:bg-transparent">
                  <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">Amount</TableHead>
                  <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">Status</TableHead>
                  <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">Invoice</TableHead>
                  <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 && (
                  <TableRow className="border-b border-[#EAE6FA]">
                    <TableCell
                      colSpan={4}
                      className="py-12 text-center text-[14px] font-medium text-[#2E00AB]/60"
                    >
                      No payments.
                    </TableCell>
                  </TableRow>
                )}
                {payments.map((p: any) => (
                  <TableRow
                    key={p.id}
                    className="border-b border-[#EAE6FA] transition-colors hover:bg-[#F5F3FF]/40"
                  >
                    <TableCell className="text-[14px] font-medium text-[#2E00AB]">
                      {formatCurrency((p.amount_cents ?? 0) / 100)} {p.currency?.toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`rounded-lg border border-transparent px-2.5 py-0.5 text-[12px] font-semibold normal-case tracking-normal shadow-none ${
                          p.status === "succeeded"
                            ? "bg-[#2E00AB] text-white hover:bg-[#2E00AB]"
                            : "bg-[#EAE6FA] text-[#2E00AB] hover:bg-[#EAE6FA]"
                        }`}
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {p.raw_event?.hosted_invoice_url ? (
                          <a
                            href={p.raw_event.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2E00AB]/60 hover:text-[#2E00AB]"
                            aria-label="View invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        ) : null}
                        {p.raw_event?.invoice_pdf ? (
                          <a
                            href={p.raw_event.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2E00AB]/60 hover:text-[#2E00AB]"
                            aria-label="Download invoice PDF"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        ) : null}
                        {!p.raw_event?.hosted_invoice_url && !p.raw_event?.invoice_pdf ? (
                          <span className="font-mono text-xs text-[#2E00AB]">
                            {p.stripe_invoice_id ?? "—"}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-[14px] font-medium text-[#2E00AB]/70">
                      {formatDate(p.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ChangeMedicineDialog
        orderId={subscription.id}
        open={changeOpen}
        onOpenChange={setChangeOpen}
        onChanged={() => q.refetch()}
        current={{
          medicineName: medicine?.name ?? null,
          variantName: variant_name ?? null,
          planName: pkg?.name ?? null,
          price: pkg?.price != null ? Number(pkg.price) : null,
          durationMonths: pkg?.duration_months ?? null,
          renewsAt: subscription.current_period_end ?? null,
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[13px] font-medium text-[#2E00AB]/60">{label}</div>
      <div className="text-[14px] font-medium text-[#2E00AB]">{value}</div>
    </div>
  );
}
