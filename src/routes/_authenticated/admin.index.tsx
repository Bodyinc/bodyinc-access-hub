import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshButton } from "@/components/admin/refresh-button";
import { KpiCard } from "@/components/admin/dashboard/kpi-card";
import { AttentionCards } from "@/components/admin/dashboard/attention-cards";
import { TrendChart } from "@/components/admin/dashboard/trend-chart";
import { StatusBreakdown } from "@/components/admin/dashboard/status-breakdown";
import { RecentRequests } from "@/components/admin/dashboard/recent-requests";
import { TopMedicines } from "@/components/admin/dashboard/side-lists";
import { getAdminDashboard } from "@/lib/admin-dashboard.functions";
import { formatCents } from "@/lib/format";
import { adminPageSubtitle, adminPageTitle } from "@/lib/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin dashboard · Body Inc Admin" },
      { name: "description", content: "Admin dashboard — Admin area of the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const fetchDashboard = useServerFn(getAdminDashboard);
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const query = useQuery({
    queryKey: ["admin-dashboard", days],
    queryFn: () => fetchDashboard({ data: { days } }),
  });

  const d = query.data;

  return (
    <div className="admin-page-shell space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={adminPageTitle}>{greeting()}</h1>
          <p className={`${adminPageSubtitle} mt-2`}>
            Everything that needs your attention across the platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border border-[#D5DEDD] bg-white">
            {([7, 30, 90] as const).map((n) => (
              <Button
                key={n}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDays(n)}
                className={`h-11 rounded-none px-4 text-[13px] font-semibold ${
                  days === n
                    ? "bg-[#E8EEED] text-[#3B4759]"
                    : "bg-white text-[#3B4759]/60 hover:bg-[#F8FBFA]"
                }`}
              >
                {n}d
              </Button>
            ))}
          </div>
          <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
        </div>
      </div>

      {query.isError ? (
        <p className="rounded-2xl border border-[#D5DEDD] bg-white p-6 text-[14px] font-semibold text-[#B8684B]">
          {(query.error as Error).message}
        </p>
      ) : null}

      {!d ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={`Revenue · ${days}d`}
              value={formatCents(d.kpis.revenue_cents)}
              delta={d.kpis.revenue_delta}
            />
            <KpiCard
              label={`New patients · ${days}d`}
              value={String(d.kpis.new_patients)}
              delta={d.kpis.new_patients_delta}
            />
            <KpiCard
              label={`Orders · ${days}d`}
              value={String(d.kpis.requests)}
              delta={d.kpis.requests_delta}
            />
            <KpiCard
              label="Active subscriptions"
              value={String(d.kpis.active_subscriptions)}
              delta={null}
              hint={`${d.attention.open_orders} orders in flight`}
            />
          </div>

          <AttentionCards attention={d.attention} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <TrendChart
                title="Revenue"
                subtitle={`Succeeded payments, last ${days} days`}
                points={d.series.map((p) => ({ date: p.date, value: p.revenue_cents }))}
                format={(v) => formatCents(v)}
              />
            </div>
            <StatusBreakdown rows={d.byStatus} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <RecentRequests rows={d.recent} />
            </div>
            <div className="space-y-4">
              <TopMedicines rows={d.topMedicines} days={days} />
            </div>
          </div>

          <TrendChart
            title="New patients"
            subtitle={`Accounts created, last ${days} days`}
            points={d.series.map((p) => ({ date: p.date, value: p.patients }))}
            format={(v) => String(v)}
            color="#B8684B"
          />
        </>
      )}
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Working late";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[124px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Skeleton className="h-[300px] rounded-2xl xl:col-span-2" />
        <Skeleton className="h-[300px] rounded-2xl" />
      </div>
    </div>
  );
}
