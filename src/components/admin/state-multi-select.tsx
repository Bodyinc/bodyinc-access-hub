import { ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { US_STATES } from "@/lib/us-states";
import { cn } from "@/lib/utils";

export function StateMultiSelect({
  selected,
  onToggle,
  onSetSelected,
  placeholder = "Add states",
  triggerClassName,
}: {
  selected: readonly string[];
  onToggle: (s: string) => void;
  onSetSelected?: (states: string[]) => void;
  placeholder?: string;
  triggerClassName?: string;
}) {
  const selectedSet = new Set(selected);
  const remaining = US_STATES.filter((s) => !selectedSet.has(s));
  const allSelected = remaining.length === 0;
  const summary =
    selected.length === 0
      ? placeholder
      : selected.length <= 3
        ? selected.join(", ")
        : `${selected.length} states selected`;

  return (
    <div className="w-full min-w-0 max-w-full space-y-2.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              triggerClassName ??
                "flex h-11 w-full min-w-0 max-w-full items-center justify-between rounded-[6px] border border-[#D5DEDD] bg-white px-3 text-left text-[14px] font-semibold text-[#3B4759] shadow-none sm:h-[53px]",
            )}
          >
            <span className={cn("truncate", selected.length === 0 && "text-[#3B4759]/40")}>
              {summary}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-[6px] border-[#D5DEDD]"
        >
          {US_STATES.map((s) => (
            <DropdownMenuCheckboxItem
              key={s}
              checked={selectedSet.has(s)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => onToggle(s)}
              className="font-medium text-[#3B4759]"
            >
              {s}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
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
