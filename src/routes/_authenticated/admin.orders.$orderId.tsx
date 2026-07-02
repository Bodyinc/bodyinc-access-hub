import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
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
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n ?? 0));
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

  const { order, items, events, customer, payments } = q.data as any;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/orders" })}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to orders
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="font-mono text-base">{order.id}</CardTitle>
            <CardDescription>{formatDate(order.created_at)}</CardDescription>
          </div>
          <Badge variant={order.status === "paid" ? "default" : "secondary"}>{order.status ?? "—"}</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Row label="Plan code" value={order.selected_plan_code ?? "—"} />
          <Row label="Payment method" value={order.payment_method_code ?? "—"} />
          <Row label="Promo code" value={order.promo_code ?? "—"} />
          <Row label="Promo savings" value={formatCurrency(order.promo_savings)} />
          <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
          <Row label="Shipping" value={formatCurrency(order.shipping)} />
          <Row label="Total" value={<strong>{formatCurrency(order.total)}</strong>} />
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
                  [customer.street_address, customer.city, customer.state_code, customer.postal_code, customer.country]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
            </>
          ) : (
            <div className="text-muted-foreground">Guest checkout / no linked profile.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">No items.</TableCell>
                </TableRow>
              )}
              {items.map((it: any) => (
                <TableRow key={it.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {it.image_url ? (
                        <img src={it.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : null}
                      <div>
                        <div className="font-medium">{it.name}</div>
                        {it.description ? (
                          <div className="text-xs text-muted-foreground">{it.description}</div>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{it.quantity}</TableCell>
                  <TableCell>{formatCurrency(it.unit_price)}</TableCell>
                  <TableCell>{formatCurrency(it.line_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
          <CardDescription>Payments recorded for this customer.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment intent</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">No payments.</TableCell>
                </TableRow>
              )}
              {payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{formatCurrency((p.amount_cents ?? 0) / 100)} {p.currency?.toUpperCase()}</TableCell>
                  <TableCell><Badge variant="secondary">{p.status}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{p.stripe_payment_intent_id ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checkout events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {events.map((e: any) => (
              <div key={e.id} className="flex justify-between border-b py-1.5 last:border-0">
                <span className="font-medium">{e.event_type}</span>
                <span className="text-muted-foreground">{formatDate(e.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
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