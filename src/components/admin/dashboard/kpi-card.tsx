import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="rounded-2xl border border-[#D5DEDD] bg-white p-5 shadow-none">
      <p className="text-[13px] font-semibold tracking-wide text-[#6A9B9C] uppercase">{label}</p>
      <p className="mt-2 text-[28px] leading-none font-semibold text-[#3B4759]">{value}</p>
      <div className="mt-3 flex items-center gap-2">
        {delta === null || delta === undefined ? (
          <span className="text-[12px] text-[#3B4759]/50">{hint ?? "No prior data"}</span>
        ) : (
          <>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                up ? "bg-[#E8EEED] text-[#41706F]" : "bg-[#F6E4DA] text-[#8F4A33]"
              }`}
            >
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta)}%
            </span>
            <span className="text-[12px] text-[#3B4759]/50">{hint ?? "vs previous period"}</span>
          </>
        )}
      </div>
    </Card>
  );
}
