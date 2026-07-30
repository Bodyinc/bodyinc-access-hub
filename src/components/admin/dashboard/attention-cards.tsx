import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ClipboardList,
  CreditCard,
  Hourglass,
  UserPlus,
  Undo2,
} from "lucide-react";

type Attention = {
  unassigned: number;
  pending_review: number;
  awaiting_payment: number;
  refunds_pending: number;
  failed_payments: number;
  abandoned_sessions: number;
};

const ICONS = {
  unassigned: UserPlus,
  pending_review: ClipboardList,
  awaiting_payment: Hourglass,
  refunds_pending: Undo2,
  failed_payments: CreditCard,
  abandoned_sessions: AlertTriangle,
} as const;

const ITEMS: Array<{ key: keyof Attention; label: string; to: string }> = [
  { key: "unassigned", label: "Unassigned orders", to: "/admin/requests" },
  { key: "pending_review", label: "Awaiting review", to: "/admin/requests" },
  { key: "awaiting_payment", label: "Additional payment due", to: "/admin/requests" },
  { key: "refunds_pending", label: "Refunds to approve", to: "/admin/billing" },
  { key: "failed_payments", label: "Failed payments", to: "/admin/billing" },
  { key: "abandoned_sessions", label: "Abandoned intakes", to: "/admin/intake-sessions" },
];

export function AttentionCards({ attention }: { attention: Attention }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {ITEMS.map((item) => {
        const count = attention[item.key] ?? 0;
        const Icon = ICONS[item.key];
        const hot = count > 0;
        return (
          <Link
            key={item.key}
            to={item.to}
            className={`group flex flex-col gap-2 rounded-2xl border p-4 transition-colors ${
              hot
                ? "border-[#D5DEDD] bg-[#E8EEED] hover:bg-[#DCE7E6]"
                : "border-[#D5DEDD] bg-white hover:bg-[#F8FBFA]"
            }`}
          >
            <Icon className={`h-4 w-4 ${hot ? "text-[#B8684B]" : "text-[#6A9B9C]"}`} />
            <span className="text-[24px] leading-none font-semibold text-[#3B4759]">{count}</span>
            <span className="text-[12px] leading-snug font-medium text-[#3B4759]/70">
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}