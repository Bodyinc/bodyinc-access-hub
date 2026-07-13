import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading order…</div>;
  if (q.isError || !q.data) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/orders" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="text-sm text-destructive">
          {(q.error as Error)?.message ?? "Order not found"}
        </div>
      </div>
    );
  }

  const { subscription, package: pkg, medicine, customer, payments, display_status } = q.data as any;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/orders" })}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to orders
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="font-mono text-base">{subscription.id}</CardTitle>
            <CardDescription>{formatDate(subscription.created_at)}</CardDescription>
          </div>
          <Badge variant={display_status === "paid" ? "default" : "secondary"}>
            {display_status ?? "—"}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Row label="Medication" value={medicine?.name ?? "—"} />
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
              <span className="font-mono text-xs">{subscription.stripe_subscription_id ?? "—"}</span>
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
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
                    .join(", ") || "—"
                }
              />
            </>
          ) : (
            <div className="text-muted-foreground">No linked profile.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
          <CardDescription>Charges recorded for this subscription.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No payments.
                  </TableCell>
                </TableRow>
              )}
              {payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {formatCurrency((p.amount_cents ?? 0) / 100)} {p.currency?.toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === "succeeded" ? "default" : "secondary"}>
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
                          className="text-muted-foreground hover:text-foreground"
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
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Download invoice PDF"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      ) : null}
                      {!p.raw_event?.hosted_invoice_url && !p.raw_event?.invoice_pdf ? (
                        <span className="font-mono text-xs">{p.stripe_invoice_id ?? "—"}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}
