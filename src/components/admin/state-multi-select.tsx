import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { US_STATES } from "@/lib/us-states";

export function StateMultiSelect({
  selected,
  onToggle,
  placeholder = "Add state",
}: {
  selected: readonly string[];
  onToggle: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2.5 w-full">
      <Select value="" onValueChange={(v) => v && onToggle(v)}>
        <SelectTrigger className="h-11 rounded-xl border-[#E2DCFA] bg-white text-[#2A00A2] font-semibold text-[14px] shadow-none">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72 rounded-xl border-[#E2DCFA]">
          {US_STATES.filter((s) => !selected.includes(s)).map((s) => (
            <SelectItem key={s} value={s} className="font-medium text-[#2A00A2]">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-1 bg-[#FDFDFF] border border-[#F4F1FE] rounded-xl">
          {selected.map((s) => (
            <Badge key={s} className="bg-[#F5F3FF] text-[#4A3AFF] hover:bg-[#F5F3FF] border border-transparent font-bold text-[12px] px-2.5 py-1 rounded-lg gap-1 shadow-none normal-case tracking-normal">
              {s}
              <button type="button" onClick={() => onToggle(s)} className="ml-1 p-0.5 hover:bg-[#E2DCFA] rounded-md transition-colors">
                <X className="h-3 w-3 stroke-[3]" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
