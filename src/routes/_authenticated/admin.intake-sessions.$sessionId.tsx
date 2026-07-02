import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getIntakeSession } from "@/lib/intake-sessions.functions";

export const Route = createFileRoute("/_authenticated/admin/intake-sessions/$sessionId")({
  component: IntakeSessionDetailPage,
});

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}
function computeBmi(height_cm?: number | null, weight_kg?: number | null) {
  const h = Number(height_cm ?? 0);
  const w = Number(weight_kg ?? 0);
  if (!h || !w) return null;
  const m = h / 100;
  return w / (m * m);
}
function formatAnswer(r: any) {
  if (r.answer_text) return r.answer_text;
  if (r.answer_number !== null && r.answer_number !== undefined) return String(r.answer_number);
  if (r.answer_boolean !== null && r.answer_boolean !== undefined) return r.answer_boolean ? "Yes" : "No";
  if (r.selected_options?.length) {
    return r.selected_options.map((o: any) => o.label).join(", ");
  }
  return "—";
}

function IntakeSessionDetailPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getIntakeSession);
  const q = useQuery({
    queryKey: ["admin-intake-session", sessionId],
    queryFn: () => get({ data: { sessionId } }),
  });

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading session…</div>;
  if (q.isError || !q.data) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/intake-sessions" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="text-sm text-destructive">
          {(q.error as Error)?.message ?? "Not found"}
        </div>
      </div>
    );
  }

  const { session, categories, eligibility, recommended_medicines, responses, selected_plan, payments } = q.data as any;
  const bmi = computeBmi(session.height_cm, session.weight_kg);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/intake-sessions" })}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to sessions
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>{session.full_name || "Unnamed session"}</CardTitle>
            <CardDescription>{session.email || "—"}</CardDescription>
          </div>
          <Badge variant="secondary">{session.status}</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <Row label="Phone" value={session.phone || "—"} />
          <Row label="State" value={session.state_code || "—"} />
          <Row label="Sex" value={<span className="capitalize">{session.sex || "—"}</span>} />
          <Row label="DOB" value={session.dob || "—"} />
          <Row label="Height (cm)" value={session.height_cm ?? "—"} />
          <Row label="Weight (kg)" value={session.weight_kg ?? "—"} />
          <Row label="BMI" value={bmi ? bmi.toFixed(1) : "—"} />
          <Row label="Created" value={formatDate(session.created_at)} />
          <Row label="Claimed by" value={session.claimed_by_user_id ? "Yes" : "No"} />
        </CardContent>
      </Card>

      {selected_plan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected plan</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="font-medium">{selected_plan.name}</div>
            <div className="text-muted-foreground">
              ${selected_plan.price_monthly} / {selected_plan.billing_cycle}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categories considered</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {categories.length === 0 ? (
            <div className="text-muted-foreground">None recorded.</div>
          ) : (
            categories.map((c: any) => (
              <Badge key={c.category_id} variant="outline">{c.name || c.slug}</Badge>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eligibility results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {eligibility.length === 0 ? (
            <div className="text-muted-foreground">No eligibility rules evaluated.</div>
          ) : (
            eligibility.map((e: any) => (
              <div key={e.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <div className="font-medium">{e.medicine_name || e.medicine_id}</div>
                  {e.reason && <div className="text-xs text-muted-foreground">{e.reason}</div>}
                </div>
                <Badge variant={e.result === "eligible" ? "default" : "destructive"}>{e.result}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended medicines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recommended_medicines.length === 0 ? (
            <div className="text-muted-foreground">None.</div>
          ) : (
            recommended_medicines.map((m: any, i: number) => (
              <div key={`${m.medicine_id}-${i}`} className="flex justify-between rounded-md border p-3">
                <span className="font-medium">{m.name || m.medicine_id}</span>
                <span className="text-muted-foreground">${m.price_monthly ?? "—"}/mo</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questionnaire answers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {responses.length === 0 ? (
            <div className="text-muted-foreground">No answers recorded.</div>
          ) : (
            responses.map((r: any) => {
              const disq = r.selected_options?.some((o: any) => o.is_disqualifying);
              return (
                <div key={r.id} className="rounded-md border p-3">
                  <div className="font-medium">{r.prompt}</div>
                  <div className={disq ? "mt-1 flex items-center gap-1.5 text-destructive" : "mt-1 text-muted-foreground"}>
                    {disq && <AlertTriangle className="h-3.5 w-3.5" />}
                    {formatAnswer(r)}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {payments.map((p: any) => (
              <div key={p.id} className="flex justify-between rounded-md border p-3">
                <span>${((p.amount_cents ?? 0) / 100).toFixed(2)} {p.currency?.toUpperCase()}</span>
                <Badge variant="secondary">{p.status}</Badge>
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