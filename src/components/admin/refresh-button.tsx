import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RefreshButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={loading}
      className="h-[37px] gap-1.5 rounded-[20px] border border-[#E8EEED] bg-white px-5 text-[14px] font-medium text-[#152A51] shadow-none hover:bg-[#F8F9FB] hover:text-[#152A51]"
    >
      <RefreshCw className={`!h-3.5 !w-3.5 ${loading ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );
}
