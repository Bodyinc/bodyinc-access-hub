import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { providerDashboard } from "@/lib/provider.functions";
import { adminCard, adminPageTitle, adminPageSubtitle } from "@/lib/admin-ui";

export const Route = createFileRoute("/_authenticated/provider/")({
  head: () => ({
    meta: [
      { title: "Practitioner dashboard · Body Inc Practitioner" },
      {
        name: "description",
        content: "Practitioner dashboard — Practitioner area of the Body Inc portal.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProviderDashboard,
});

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Working late";
}

function useTimeGreeting() {
  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setGreeting(greetingFor(new Date()));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);
  return greeting;
}

function ProviderDashboard() {
  const navigate = useNavigate();
  const greeting = useTimeGreeting();
  const get = useServerFn(providerDashboard);
  const q = useQuery({ queryKey: ["provider-dashboard"], queryFn: () => get({}) });
  const d = (q.data as any) ?? {};

  const heading = greeting
    ? `${greeting}${d.full_name ? `, ${d.full_name}` : ""}`
    : "Practitioner dashboard";

  const tiles: { label: string; value: number; hint: string; to: string }[] = [
    {
      label: "Awaiting your review",
      value: d.pending_review ?? 0,
      hint: "Orders that need an approval decision",
      to: "/provider/requests",
    },
    {
      label: "Awaiting patient payment",
      value: d.awaiting_additional_payment ?? 0,
      hint: "Price difference not yet paid",
      to: "/provider/requests",
    },
    {
      label: "Ready to prescribe",
      value: d.approved ?? 0,
      hint: "Approved, prescription not generated",
      to: "/provider/requests",
    },
    {
      label: "Prescribed today",
      value: d.prescribed_today ?? 0,
      hint: "Prescriptions you generated today",
      to: "/provider/requests",
    },
    {
      label: "Available to claim",
      value: d.claimable ?? 0,
      hint: "Unassigned orders in your licensed states",
      to: "/provider/queue",
    },
    {
      label: "Open orders",
      value: d.open ?? 0,
      hint: "Everything currently in flight",
      to: "/provider/requests",
    },
  ];

  return (
    <div className="admin-page-shell space-y-5 font-['DM_Sans',sans-serif]">
      <div className="space-y-1">
        <h1 className={adminPageTitle}>{heading}</h1>
        <p className={adminPageSubtitle}>Your workload at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => navigate({ to: t.to })}
            className="text-left"
          >
            <Card className={`${adminCard} h-full transition-colors hover:bg-[#E8EEED]/50`}>
              <CardContent className="space-y-1 p-5">
                <div className="text-[13px] font-medium text-[#3B4759]/60">{t.label}</div>
                <div className="text-[28px] font-bold leading-tight text-[#3B4759]">
                  {q.isLoading ? "—" : t.value}
                </div>
                <div className="text-[12px] text-[#3B4759]/60">{t.hint}</div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
