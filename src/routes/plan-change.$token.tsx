import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlanChange, respondToPlanChange } from "@/lib/plan-change.functions";

export const Route = createFileRoute("/plan-change/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Confirm plan change — Body Inc" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlanChangePage,
});

function PlanChangePage() {
  const { token } = Route.useParams();
  const load = useServerFn(getPlanChange);
  const respond = useServerFn(respondToPlanChange);
  const [done, setDone] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["plan-change", token],
    queryFn: () => load({ data: { token } }),
  });

  const mut = useMutation({
    mutationFn: (decision: "confirm" | "decline") => respond({ data: { token, decision } }),
    onSuccess: (res, decision) => {
      if (res.payUrl) {
        window.location.href = res.payUrl;
        return;
      }
      setDone(
        decision === "decline"
          ? "You declined this change. Your previous plan stays in place, and your practitioner will decide the next step."
          : "You confirmed this change. Your practitioner will review it again before anything is sent to the pharmacy.",
      );
    },
  });

  const row = q.data;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F7F6] p-4 font-['DM_Sans',sans-serif]">
      <Card className="w-full max-w-lg border-[#D5DEDD]">
        <CardHeader>
          <CardTitle className="text-[#152A51]">Plan change</CardTitle>
          <CardDescription>
            Confirm or decline the treatment your practitioner proposed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-[14px] text-[#3B4759]">
          {q.isLoading ? <p>Loading…</p> : null}
          {q.isError ? <p>This link could not be opened. Ask your practitioner to send it again.</p> : null}
          {row && !row.found ? <p>This link is no longer valid.</p> : null}
          {done ? <p className="font-medium">{done}</p> : null}
          {row?.found && !done ? (
            <>
              {row.message ? <p className="font-medium">{row.message}</p> : null}
              <p>
                Proposed treatment: <span className="font-semibold">{row.medicine_name}</span>
              </p>
              {(row.amount_cents ?? 0) > 0 ? (
                <p>Confirming this change includes an additional payment of ${((row.amount_cents ?? 0) / 100).toFixed(2)}.</p>
              ) : (
                <p>There is no extra charge. A lower price, if any, is credited only after you confirm.</p>
              )}
              {row.deadline ? (
                <p className="text-[13px] text-[#3B4759]/70">
                  If you do not respond by {new Date(row.deadline).toLocaleString()}, the previous plan is restored.
                </p>
              ) : null}
              {row.open ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    disabled={mut.isPending}
                    onClick={() => mut.mutate("confirm")}
                    className="bg-[#6A9B9C] text-white hover:bg-[#5B8788]"
                  >
                    {mut.isPending ? "Saving…" : (row.amount_cents ?? 0) > 0 ? "Pay to confirm" : "Confirm"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={mut.isPending}
                    onClick={() => mut.mutate("decline")}
                  >
                    Decline
                  </Button>
                </div>
              ) : null}
              {mut.isError ? (
                <p className="text-[#8F4A33]">
                  {mut.error instanceof Error ? mut.error.message : "Could not save your response."}
                </p>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
