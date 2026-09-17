import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { US_STATES } from "@/lib/us-states";

export function StateMultiSelect({
  selected,
  onToggle,
  onSetSelected,
  placeholder = "Add state",
  triggerClassName,
}: {
  selected: readonly string[];
  onToggle: (s: string) => void;
  onSetSelected?: (states: string[]) => void;
  placeholder?: string;
  triggerClassName?: string;
}) {
  const remaining = US_STATES.filter((s) => !selected.includes(s));
  const allSelected = remaining.length === 0;

  return (
    <div className="w-full min-w-0 max-w-full space-y-2.5">
      <Select value="" onValueChange={(v) => v && onToggle(v)}>
        <SelectTrigger
          className={
            triggerClassName ??
            "h-11 w-full min-w-0 max-w-full rounded-[6px] border border-[#D5DEDD] bg-white text-[14px] font-semibold text-[#3B4759] shadow-none sm:h-[53px]"
          }
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72 rounded-[6px] border-[#D5DEDD]">
          {remaining.map((s) => (
            <SelectItem key={s} value={s} className="font-medium text-[#3B4759]">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {onSetSelected ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={allSelected}
            onClick={() => onSetSelected([...US_STATES])}
            className="text-[12px] font-semibold text-[#6A9B9C] transition-colors hover:text-[#5B8788] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Select all
          </button>
          {selected.length > 0 ? (
            <button
              type="button"
              onClick={() => onSetSelected([])}
              className="text-[12px] font-semibold text-[#3B4759]/70 transition-colors hover:text-[#3B4759]"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
      {selected.length > 0 && (
        <div className="flex min-w-0 max-w-full flex-wrap gap-1.5 rounded-[6px] border border-[#D5DEDD] bg-[#F8FBFA] p-1">
          {selected.map((s) => (
            <Badge
              key={s}
              className="gap-1 rounded-lg border border-transparent bg-[#E8EEED] px-2.5 py-1 text-[12px] font-bold text-[#3B4759] shadow-none normal-case tracking-normal hover:bg-[#E8EEED]"
            >
              {s}
              <button
                type="button"
                onClick={() => onToggle(s)}
                className="ml-1 rounded-md p-0.5 transition-colors hover:bg-[#D5DEDD]"
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
