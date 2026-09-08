import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
import { formatDateTime, formatDollars, formatRecordId, normalizeIdSearch } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/orders/")({
  head: () => ({
    meta: [
      { title: "Orders · Body Inc Admin" },
      { name: "description", content: "Orders — Admin area of the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersListPage,
});

const ordersFilterInput =
  "h-[42px] w-full rounded-[12px] border-0 bg-[#F4F6F5] py-[10px] pl-10 pr-[14px] text-[14px] font-normal text-[#152A51] shadow-none placeholder:text-[#3B4759]/40 focus-visible:border-0 focus-visible:bg-[#EEF1F0] focus-visible:ring-1 focus-visible:ring-[#152A51]/10";

const ordersFilterSelect =
  "h-[42px] w-full rounded-[12px] border-0 bg-[#F4F6F5] px-[14px] py-[10px] text-[14px] font-normal text-[#152A51] shadow-none focus:ring-1 focus:ring-[#152A51]/10 sm:w-[180px]";

const tableHeadClass =
  "h-12 px-6 text-[12px] font-medium uppercase tracking-[0.04em] text-[#3B4759]/70 sm:h-14 sm:text-[13px]";

const tableCellClass = "px-6 py-[14px] align-middle";

function OrderStatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-[14px] text-[#3B4759]/70">—</span>;

  const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");

  if (status === "paid") {
    return (
      <Badge
        variant="secondary"
        className="rounded-full border-0 bg-[#DCFCE7] px-[10px] py-1 text-[12px] font-medium leading-none text-[#15803D] shadow-none hover:bg-[#DCFCE7]"
      >
        Paid
      </Badge>
    );
  }

  if (status === "canceled") {
    return (
      <Badge
        variant="secondary"
        className="rounded-full border-0 bg-[#F3F4F6] px-[10px] py-1 text-[12px] font-medium leading-none text-[#6B7280] shadow-none hover:bg-[#F3F4F6]"
      >
        {label}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="rounded-full border-0 bg-[#FEF3C7] px-[10px] py-1 text-[12px] font-medium leading-none text-[#B45309] shadow-none hover:bg-[#FEF3C7]"
    >
      {label}
    </Badge>
  );
}

function OrdersListPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const list = useServerFn(listOrders);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState<string>("all");

  const searchTerm = normalizeIdSearch(debounced);

  const query = useQuery({
    queryKey: ["admin-orders", { search: searchTerm, status }],
    queryFn: () => list({ data: { search: searchTerm || undefined, status } }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans',sans-serif]">
      <div className="admin-page-header">
        <div className="min-w-0 space-y-2">
          <h2 className="text-[28px] font-medium leading-tight text-[#152A51]">Orders</h2>
          <p className="text-base font-normal text-[#3B4759]/70 sm:text-lg">
            Review checkout orders, line items, and payments.
          </p>
        </div>
        <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-[14px] top-1/2 h-4 w-4 -translate-y-1/2 text-[#3B4759]/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or order ID…"
            className={ordersFilterInput}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className={ordersFilterSelect}>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="rounded-[12px] border border-[#E8EEED]">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="past_due">Past due</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="max-w-full overflow-hidden rounded-2xl border border-[#E8EEED] bg-white shadow-none">
        <div className="admin-table-scroll">
          <Table className="min-w-[720px] border-collapse">
            <TableHeader className="bg-[#F2F7F6]">
              <TableRow className="border-b border-[#E8EEED] hover:bg-transparent">
                <TableHead className={tableHeadClass}>Order</TableHead>
                <TableHead className={tableHeadClass}>Customer</TableHead>
                <TableHead className={tableHeadClass}>Item</TableHead>
                <TableHead className={tableHeadClass}>Amount</TableHead>
                <TableHead className={tableHeadClass}>Status</TableHead>
                <TableHead className={tableHeadClass}>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow className="border-b border-[#E8EEED]">
                  <TableCell
                    colSpan={6}
                    className={`${tableCellClass} py-12 text-center text-[14px] font-medium text-[#3B4759]/60`}
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {query.isError && (
                <TableRow className="border-b border-[#E8EEED]">
                  <TableCell
                    colSpan={6}
                    className={`${tableCellClass} py-12 text-center text-[14px] font-semibold text-[#B8684B]`}
                  >
                    {(query.error as Error).message}
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && query.data?.length === 0 && (
                <TableRow className="border-b border-[#E8EEED]">
                  <TableCell
                    colSpan={6}
                    className={`${tableCellClass} py-12 text-center text-[14px] font-medium text-[#3B4759]/60`}
                  >
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
              {query.data?.map((o: any) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer border-b border-[#E8EEED] bg-white transition-colors hover:bg-[#F8F9FB]"
                  onPointerEnter={() => {
                    void router.preloadRoute({
                      to: "/admin/orders/$orderId",
                      params: { orderId: o.id },
                    });
                  }}
                  onClick={() =>
                    navigate({ to: "/admin/orders/$orderId", params: { orderId: o.id } })
                  }
                >
                  <TableCell className={`${tableCellClass} text-[14px] font-medium text-[#152A51]`}>
                    {formatRecordId(o.id)}
                  </TableCell>
                  <TableCell className={tableCellClass}>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-[#152A51]">
                        {o.customer_name || "—"}
                      </span>
                      {o.is_guest ? (
                        <span
                          className="rounded bg-[#E8EEED] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6A9B9C]"
                          title="Paid during onboarding; account not yet created"
                        >
                          Guest
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[12px] font-normal text-[#3B4759]/70">
                      {o.customer_email || "—"}
                    </div>
                  </TableCell>
                  <TableCell
                    className={`${tableCellClass} max-w-[220px] truncate text-[14px] font-normal text-[#152A51]`}
                  >
                    {o.item_name}
                  </TableCell>
                  <TableCell className={`${tableCellClass} text-[14px] font-semibold text-[#152A51]`}>
                    {o.amount != null ? formatDollars(o.amount) : "—"}
                  </TableCell>
                  <TableCell className={tableCellClass}>
                    <OrderStatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className={`${tableCellClass} text-[14px] font-normal text-[#3B4759]/70`}>
                    {formatDateTime(o.created_at)}
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
