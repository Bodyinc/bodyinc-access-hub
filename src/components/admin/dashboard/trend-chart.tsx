import { Card } from "@/components/ui/card";

type Point = { date: string; value: number };

function path(points: Point[], w: number, h: number, max: number) {
  const step = points.length > 1 ? w / (points.length - 1) : w;
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${(h - (p.value / max) * h).toFixed(2)}`)
    .join(" ");
}

export function TrendChart({
  title,
  subtitle,
  points,
  format,
  color = "#6A9B9C",
}: {
  title: string;
  subtitle?: string;
  points: Point[];
  format: (v: number) => string;
  color?: string;
}) {
  const w = 720;
  const h = 180;
  const max = Math.max(1, ...points.map((p) => p.value));
  const line = path(points, w, h, max);
  const area = points.length ? `${line} L${w},${h} L0,${h} Z` : "";
  const total = points.reduce((s, p) => s + p.value, 0);
  const peak = points.reduce<Point | null>((a, p) => (!a || p.value > a.value ? p : a), null);

  return (
    <Card className="rounded-2xl border border-[#D5DEDD] bg-white p-5 shadow-none">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-[16px] font-semibold text-[#3B4759]">{title}</h3>
          {subtitle ? <p className="text-[13px] text-[#3B4759]/60">{subtitle}</p> : null}
        </div>
        <p className="text-[18px] font-semibold text-[#3B4759]">{format(total)}</p>
      </div>

      <div className="mt-4">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[180px] w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              x2={w}
              y1={h * f}
              y2={h * f}
              stroke="#D5DEDD"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          ))}
          {area ? <path d={area} fill={`url(#grad-${title.replace(/\s/g, "")})`} /> : null}
          {line ? (
            <path
              d={line}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          ) : null}
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-[12px] text-[#3B4759]/50">
        <span>{points[0]?.date ?? ""}</span>
        <span>
          {peak && peak.value > 0 ? `Peak ${format(peak.value)} on ${peak.date}` : "No activity"}
        </span>
        <span>{points[points.length - 1]?.date ?? ""}</span>
      </div>
    </Card>
  );
}