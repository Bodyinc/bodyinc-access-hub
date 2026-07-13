import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RefreshButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <Button
  type="button"
  variant="outline"
  size="sm"
  onClick={onClick}
  disabled={loading}
  className="h-10 px-4 gap-2 rounded-xl border-brand-border bg-white text-brand font-medium shadow-sm hover:bg-brand-surface hover:border-brand"
>
  <RefreshCw
    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
  />
  Refresh
</Button>
  );
}
