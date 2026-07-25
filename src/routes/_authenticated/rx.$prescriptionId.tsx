import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getPrescription } from "@/lib/requests.functions";

export const Route = createFileRoute("/_authenticated/rx/$prescriptionId")({
  validateSearch: (s: Record<string, unknown>) => ({
    download: s.download === true || s.download === "1" || s.download === "true",
  }),
  component: RxPage,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function RxPage() {
  const { prescriptionId } = Route.useParams();
  const { download } = Route.useSearch();
  const router = useRouter();
  const get = useServerFn(getPrescription);
  const q = useQuery({
    queryKey: ["prescription", prescriptionId],
    queryFn: () => get({ data: { prescriptionId } }),
  });

  useEffect(() => {
    if (download && q.data) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [download, q.data]);

  if (q.isLoading) {
    return <div className="p-8 text-[14px] text-[#2E00AB]/60 font-['DM_Sans',sans-serif]">Loading…</div>;
  }
  if (q.isError || !q.data) {
    return (
      <div className="p-8 font-['DM_Sans',sans-serif]">
        <div className="text-[14px] font-semibold text-[#FF4D6D]">
          {(q.error as Error)?.message ?? "Prescription not found"}
        </div>
      </div>
    );
  }

  const rx = q.data as {
    id: string;
    medicineName: string;
    directions: string | null;
    createdAt: string;
    patientName: string;
    providerName: string | null;
  };

  return (
    <div className="min-h-svh bg-[#FAF8FF] p-4 font-['DM_Sans',sans-serif] print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="text-sm font-medium text-[#2E00AB] hover:opacity-80"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-[#2E00AB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#25008A]"
          >
            Download / Print
          </button>
        </div>

        <div className="rounded-xl border border-[#E6DEFF] bg-white p-8 print:border-0 print:p-0">
          <div className="flex items-start justify-between border-b border-[#E6DEFF] pb-4">
            <div>
              <div className="text-lg font-bold text-[#2E00AB]">Body Inc</div>
              <div className="text-xs uppercase tracking-wide text-[#2E00AB]/60">Prescription</div>
            </div>
            <div className="text-right text-xs text-[#2E00AB]/70">
              <div>Date: {formatDate(rx.createdAt)}</div>
              <div className="font-mono">Rx: {rx.id.slice(0, 8)}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs font-medium uppercase text-[#2E00AB]/50">Patient</div>
              <div className="text-[#2E00AB]">{rx.patientName}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-[#2E00AB]/50">
                Prescribing provider
              </div>
              <div className="text-[#2E00AB]">{rx.providerName ?? "—"}</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs font-medium uppercase text-[#2E00AB]/50">Medication</div>
            <div className="text-lg font-semibold text-[#2E00AB]">{rx.medicineName}</div>
            {rx.directions ? (
              <div className="mt-1 text-sm text-[#2E00AB]/80">{rx.directions}</div>
            ) : null}
          </div>

          <div className="mt-10 border-t border-[#E6DEFF] pt-4 text-xs text-[#2E00AB]/50">
            This prescription was generated electronically by Body Inc.
          </div>
        </div>
      </div>
    </div>
  );
}
