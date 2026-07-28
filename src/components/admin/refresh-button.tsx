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
    border-[#D5DEDD]
    bg-white
    text-[#3B4759]
    font-medium
    shadow-sm
    hover:bg-[#F2F7F6]
    hover:border-[#C3D2D1]
  "
>
  <RefreshCw
    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
  />
  Refresh
</Button>
  );
}
