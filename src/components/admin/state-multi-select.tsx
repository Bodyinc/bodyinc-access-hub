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
    <div className="w-full min-w-0 max-w-full space-y-2.5">
      <Select value="" onValueChange={(v) => v && onToggle(v)}>
        <SelectTrigger className="h-11 w-full min-w-0 max-w-full rounded-[6px] border border-[#EAE6FA] bg-white text-[14px] font-semibold text-[#2E00AB] shadow-none sm:h-[53px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72 rounded-[6px] border-[#EAE6FA]">
          {US_STATES.filter((s) => !selected.includes(s)).map((s) => (
            <SelectItem key={s} value={s} className="font-medium text-[#2E00AB]">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected.length > 0 && (
        <div className="flex min-w-0 max-w-full flex-wrap gap-1.5 rounded-[6px] border border-[#EAE6FA] bg-[#FDFDFF] p-1">
          {selected.map((s) => (
            <Badge
              key={s}
              className="gap-1 rounded-lg border border-transparent bg-[#F5F3FF] px-2.5 py-1 text-[12px] font-bold text-[#2E00AB] shadow-none normal-case tracking-normal hover:bg-[#F5F3FF]"
            >
              {s}
              <button
                type="button"
                onClick={() => onToggle(s)}
                className="ml-1 rounded-md p-0.5 transition-colors hover:bg-[#EAE6FA]"
              >
                <X className="h-3 w-3 stroke-[3]" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
