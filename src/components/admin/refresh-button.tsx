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
  className="
    h-11
    px-5
    gap-2
    rounded-xl
    border-[#E2DCFA]
    bg-white
    text-[#2A00A2]
    font-medium
    shadow-sm
    hover:bg-[#F8F6FF]
    hover:border-[#D7CCFA]
  "
>
  <RefreshCw
    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
  />
  Refresh
</Button>
  );
}
