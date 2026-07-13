import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listOrders } from "@/lib/orders.functions";
import { RefreshButton } from "@/components/admin/refresh-button";

export const Route = createFileRoute("/_authenticated/admin/orders/")({
  component: OrdersListPage,
});

function formatCurrency(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

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

function OrdersListPage() {
  const navigate = useNavigate();
  const list = useServerFn(listOrders);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState<string>("all");

  const query = useQuery({
    queryKey: ["admin-orders", { search: debounced, status }],
    queryFn: () => list({ data: { search: debounced || undefined, status } }),
  });

  return (
    // FIX: Replaced constrained wrappers with full left-aligned canvas setup
    <div className="w-full text-left m-0 p-0 space-y-5 max-w-none">
      {/* Header Info Banner Section */}
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold text-brand tracking-tight">Orders</h2>
          <p className="text-sm text-brand-strong/70 font-medium">
            Review checkout orders, line items, and payments.
          </p>
        </div>
        <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
      </div>

      {/* Filter and Input Controls Strip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-brand-strong/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or order id"
            className="pl-9 h-10 rounded-xl border-brand-border focus-visible:ring-brand-strong text-brand font-semibold text-[14px] placeholder:text-brand-strong/40 bg-white"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44 h-10 rounded-xl border-brand-border bg-white text-brand font-semibold text-[14px] shadow-none">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-brand-border">
            <SelectItem value="all" className="font-medium text-brand">All statuses</SelectItem>
            <SelectItem value="paid" className="font-medium text-brand">Paid</SelectItem>
            <SelectItem value="past_due" className="font-medium text-brand">Past due</SelectItem>
            <SelectItem value="canceled" className="font-medium text-brand">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Matrix Table Structure */}
      <Card className="w-full overflow-hidden border border-brand-border bg-white shadow-sm rounded-2xl max-w-none m-0">
        <div className="overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader className="bg-white">
            <TableRow className="border-b border-brand-border hover:bg-transparent">
              <TableHead className="text-brand font-bold h-11 text-[13px]">Order</TableHead>
              <TableHead className="text-brand font-bold h-11 text-[13px]">Customer</TableHead>
              <TableHead className="text-brand font-bold h-11 text-[13px]">Item</TableHead>
              <TableHead className="text-brand font-bold h-11 text-[13px]">Amount</TableHead>
              <TableHead className="text-brand font-bold h-11 text-[13px]">Status</TableHead>
              <TableHead className="text-brand font-bold h-11 text-[13px]">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow className="border-b border-brand-border/50">
                <TableCell colSpan={6} className="py-12 text-center text-brand-strong/60 font-semibold text-[14px]">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {query.isError && (
              <TableRow className="border-b border-brand-border/50">
                <TableCell colSpan={6} className="py-12 text-center text-[#FF4D6D] font-semibold text-[14px]">
                  {(query.error as Error).message}
                </TableCell>
              </TableRow>
            )}
            {!query.isLoading && query.data?.length === 0 && (
              <TableRow className="border-b border-brand-border/50">
                <TableCell colSpan={6} className="py-12 text-center text-brand-strong/60 font-semibold text-[14px]">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
            {query.data?.map((o: any) => (
              <TableRow
                key={o.id}
                className="cursor-pointer border-b border-brand-border/50 hover:bg-brand-surface/40 transition-colors"
                onClick={() => navigate({ to: "/admin/orders/$orderId", params: { orderId: o.id } })}
              >
                <TableCell className="font-mono text-xs text-brand-strong font-medium">
                  {o.id.slice(0, 8)}…
                </TableCell>
                <TableCell>
                  <div className="font-bold text-brand text-[14px]">{o.customer_name || "—"}</div>
                  <div className="text-[12px] text-brand-strong font-semibold">{o.customer_email || "—"}</div>
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-brand font-semibold text-[14px]">
                  {o.item_name}
                </TableCell>
                <TableCell className="text-brand font-bold text-[14px]">
                  {o.amount != null ? formatCurrency(o.amount) : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={o.status === "paid" ? "default" : "secondary"}
                    className={`font-bold text-[12px] px-2.5 py-0.5 rounded-lg shadow-none normal-case tracking-normal border border-transparent ${
                      o.status === "paid"
                        ? "bg-[#E8F5E9] text-brand-strong hover:bg-[#E8F5E9]"
                        : o.status === "canceled"
                        ? "bg-[#FFEBEE] text-[#C62828] hover:bg-[#FFEBEE]"
                        : "bg-[#FFF3E0] text-[#EF6C00] hover:bg-[#FFF3E0]"
                    }`}
                  >
                    {o.status ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-brand-strong font-medium text-[14px]">
                  {formatDate(o.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  );
}