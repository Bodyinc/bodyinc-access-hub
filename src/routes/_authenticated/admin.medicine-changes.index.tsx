import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshButton } from "@/components/admin/refresh-button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listMedicineChanges } from "@/lib/audit.functions";
import { adminInput, adminPageSubtitle, adminPageTitle } from "@/lib/admin-ui";
import { formatDateTime, formatDollars, formatRecordId } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/medicine-changes/")({
  head: () => ({
    meta: [
      { title: "Medicine changes · Body Inc Admin" },
      {
        name: "description",
        content: "Audit trail of every medicine or plan switch made by an admin or practitioner.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MedicineChangesPage,
});

const ROLES = [
  { value: "all", label: "Everyone" },
  { value: "admin", label: "Admins" },
  { value: "provider", label: "Practitioners" },
] as const;

const RANGES: Array<{ label: string; days?: number }> = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All time" },
];

const filterChip = (active: boolean) =>
  `h-[34px] rounded-full border px-4 text-[13px] font-semibold transition-colors ${
    active
      ? "border-transparent bg-[#6A9B9C] text-white"
      : "border-[#D5DEDD] bg-white text-[#3B4759]/70 hover:bg-[#F2F7F6]"
  }`;

function MedicineChangesPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | "admin" | "provider">("all");
  const [days, setDays] = useState<number | undefined>(undefined);
  const [crossOnly, setCrossOnly] = useState(false);
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 350);

  const list = useServerFn(listMedicineChanges);
  const query = useQuery({
    queryKey: ["admin-medicine-changes", debounced, role, days, crossOnly, page],
    queryFn: () =>
      list({
        data: {
          search: debounced || undefined,
          role,
          days,
          crossCategoryOnly: crossOnly,
          page,
          limit: 25,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const rows = (query.data?.data as any[]) ?? [];
  const totalPages = query.data?.total_pages ?? 0;

  const csvHref = useMemo(() => {
    if (!rows.length) return null;
    const head = [
      "Record",
      "Source",
      "Patient",
      "Email",
      "From",
      "To",
      "Difference",
      "Changed by",
      "Role",
      "Cross-category reason",
      "Note",
      "When",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = rows.map((r) =>
      [
        formatRecordId(r.entity_id),
        r.source,
        r.patient_name,
        r.patient_email,
        r.from_label,
        r.to_label,
        (r.delta_cents / 100).toFixed(2),
        r.actor_name,
        r.actor_role,
        r.cross_category_reason,
        r.note,
        r.created_at,
      ]
        .map(esc)
        .join(","),
    );
    return `data:text/csv;charset=utf-8,${encodeURIComponent([head.join(","), ...body].join("\n"))}`;
  }, [rows]);

  function reset(fn: () => void) {
    fn();
    setPage(1);
  }

  return (
    <div className="admin-page-shell space-y-4 font-['DM_Sans',sans-serif] sm:space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <h2 className={adminPageTitle}>Medicine changes</h2>
          <p className={adminPageSubtitle}>
            Every medicine, dose or plan switch made by an admin or practitioner, with the price
            difference and clinical reason.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {csvHref && (
            <Button
              asChild
              variant="outline"
              className="h-[37px] gap-1.5 rounded-[20px] border-[#E8EEED] bg-white px-5 text-[14px] font-medium text-[#152A51] shadow-none hover:bg-[#F8F9FB]"
            >
              <a href={csvHref} download="medicine-changes.csv">
                <Download className="!h-3.5 !w-3.5" />
                Export CSV
              </a>
            </Button>
          )}
          <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 w-full lg:max-w-[390px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A9B9C]/60" />
          <Input
            placeholder="Search by record ID, patient, or medicine…"
            value={search}
            onChange={(e) => reset(() => setSearch(e.target.value))}
            className={`${adminInput} pl-10`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => reset(() => setRole(r.value))}
              className={filterChip(role === r.value)}
            >
              {r.label}
            </button>
          ))}
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => reset(() => setDays(r.days))}
              className={filterChip(days === r.days)}
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => reset(() => setCrossOnly((v) => !v))}
            className={filterChip(crossOnly)}
          >
            Cross-category only
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <div className="admin-table-scroll">
          <Table className="min-w-[1080px] border-collapse">
            <TableHeader className="bg-white">
              <TableRow className="border-b border-[#D5DEDD] hover:bg-transparent">
                {["Record", "Patient", "Change", "Difference", "Changed by", "Reason", "When"].map(
                  (h) => (
                    <TableHead
                      key={h}
                      className="h-14 border-r border-[#D5DEDD] px-6 text-[14px] font-semibold text-[#3B4759] last:border-r-0"
                    >
                      {h}
                    </TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-[15px] text-[#3B4759]/70">
                    Loading rows...
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-[15px] text-[#3B4759]/70">
                    No medicine changes recorded for these filters.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-b border-[#D5DEDD] transition-colors hover:bg-[#F2F7F6]"
                >
                  <TableCell className="border-r border-[#D5DEDD] px-6 py-4">
                    <div className="text-[14px] font-semibold text-[#3B4759]">
                      {formatRecordId(r.entity_id)}
                    </div>
                    <div className="text-[12px] font-medium capitalize text-[#3B4759]/70">
                      {r.source}
                    </div>
                  </TableCell>
                  <TableCell className="border-r border-[#D5DEDD] px-6 py-4">
                    <div className="text-[14px] font-semibold text-[#3B4759]">
                      {r.patient_name ?? "—"}
                    </div>
                    <div className="text-[12px] font-medium text-[#3B4759]/70">
                      {r.patient_email ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="border-r border-[#D5DEDD] px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-[#3B4759]/80">
                      <span>{r.from_label}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#6A9B9C]" />
                      <span className="font-semibold text-[#3B4759]">{r.to_label}</span>
                    </div>
                    {r.cross_category ? (
                      <Badge className="mt-1 rounded-md border border-[#E3C08D] bg-[#FDF6E7] px-2 py-0.5 text-[11px] font-bold text-[#8A5A1E] shadow-none">
                        Cross-category
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="border-r border-[#D5DEDD] px-6 py-4 text-[14px] font-semibold">
                    <span
                      className={
                        r.delta_cents > 0
                          ? "text-[#B8684B]"
                          : r.delta_cents < 0
                            ? "text-[#6A9B9C]"
                            : "text-[#3B4759]/60"
                      }
                    >
                      {r.delta_cents > 0 ? "+" : r.delta_cents < 0 ? "−" : ""}
                      {formatDollars(Math.abs(r.delta_cents) / 100)}
                    </span>
                  </TableCell>
                  <TableCell className="border-r border-[#D5DEDD] px-6 py-4">
                    <div className="text-[14px] font-medium text-[#3B4759]">
                      {r.actor_name ?? "—"}
                    </div>
                    <div className="text-[12px] font-medium capitalize text-[#3B4759]/70">
                      {r.actor_role}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[260px] border-r border-[#D5DEDD] px-6 py-4 text-[13px] font-medium text-[#3B4759]/80">
                    {r.cross_category_reason || r.note || "—"}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-[14px] font-medium text-[#3B4759]/70">
                    {formatDateTime(r.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-[#3B4759]/70">
          {query.data?.total ?? 0} change(s)
          {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
        </span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border-[#D5DEDD] text-[#3B4759]/80"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border-[#D5DEDD] text-[#3B4759]/80"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
