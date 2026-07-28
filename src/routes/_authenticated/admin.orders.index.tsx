import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";
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
import { adminPageTitle, adminPageSubtitle, adminInput, adminSelect } from "@/lib/admin-ui";

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
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans',sans-serif]">
      <div className="admin-page-header">
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <h2 className={adminPageTitle}>Orders</h2>
          <p className={adminPageSubtitle}>
            Review checkout orders, line items, and payments.
          </p>
        </div>
        <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3B4759]/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or order id"
            className={`${adminInput} pl-9`}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className={`${adminSelect} sm:w-44`}>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="past_due">Past due</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="admin-table-wrap m-0 w-full max-w-none">
        <div className="admin-table-scroll">
        <Table className="min-w-[720px]">
          <TableHeader className="bg-[#F8FBFA]">
            <TableRow className="border-b border-[#D5DEDD] hover:bg-transparent">
              <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">Order</TableHead>
              <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">Customer</TableHead>
              <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">Item</TableHead>
              <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">Amount</TableHead>
              <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">Status</TableHead>
              <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow className="border-b border-[#D5DEDD]">
                <TableCell colSpan={6} className="py-12 text-center text-[#3B4759]/60 font-medium text-[14px]">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {query.isError && (
              <TableRow className="border-b border-[#D5DEDD]">
                <TableCell colSpan={6} className="py-12 text-center text-[#B8684B] font-semibold text-[14px]">
                  {(query.error as Error).message}
                </TableCell>
              </TableRow>
            )}
            {!query.isLoading && query.data?.length === 0 && (
              <TableRow className="border-b border-[#D5DEDD]">
                <TableCell colSpan={6} className="py-12 text-center text-[#3B4759]/60 font-medium text-[14px]">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
            {query.data?.map((o: any) => (
              <TableRow
                key={o.id}
                className="cursor-pointer border-b border-[#D5DEDD] hover:bg-[#E8EEED]/40 transition-colors"
                onClick={() => navigate({ to: "/admin/orders/$orderId", params: { orderId: o.id } })}
              >
                <TableCell className="font-mono text-xs text-[#3B4759]/70 font-medium">
                  {o.id.slice(0, 8)}…
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#3B4759] text-[14px]">{o.customer_name || "—"}</span>
                    {o.is_guest ? (
                      <span
                        className="rounded bg-[#E8EEED] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6A9B9C]"
                        title="Paid during onboarding; account not yet created"
                      >
                        Guest
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[12px] text-[#3B4759]/70 font-medium">{o.customer_email || "—"}</div>
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-[#3B4759] font-medium text-[14px]">
                  {o.item_name}
                </TableCell>
                <TableCell className="text-[#3B4759] font-semibold text-[14px]">
                  {o.amount != null ? formatCurrency(o.amount) : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={o.status === "paid" ? "default" : "secondary"}
                    className={`font-bold text-[12px] px-2.5 py-0.5 rounded-lg shadow-none normal-case tracking-normal border border-transparent ${
                      o.status === "paid"
                        ? "bg-[#D5DEDD] text-[#6A9B9C] hover:bg-[#E8F5E9]"
                        : o.status === "canceled"
                        ? "bg-[#D5DEDD] text-[#6A9B9C] hover:bg-[#F6E4DA]"
                        : "bg-[#D5DEDD] text-[#6A9B9C] hover:bg-[#FFF3E0]"
                    }`}
                  >
                    {o.status ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-[#3B4759]/70 font-medium text-[14px]">
                  {formatDate(o.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}