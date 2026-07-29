import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { adminBtnPrimary, adminBtnSecondary } from "@/lib/admin-ui";

export type FormActionBarProps = {
  submitting?: boolean;
  disabled?: boolean;
  submitLabel: string;
  savingLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  /** When provided the primary button is a plain button instead of a submit. */
  onSubmit?: () => void;
  /** Optional content rendered on the left (hints, secondary actions). */
  children?: ReactNode;
};

/**
 * Sticky footer for long admin forms so Save/Cancel stay reachable without
 * scrolling. Supports Cmd/Ctrl+S to save.
 */
export function FormActionBar({
  submitting,
  disabled,
  submitLabel,
  savingLabel = "Saving…",
  cancelLabel = "Cancel",
  onCancel,
  onSubmit,
  children,
}: FormActionBarProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const busy = !!submitting || !!disabled;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.key === "s" || e.key === "S") || !(e.metaKey || e.ctrlKey)) return;
      const node = ref.current;
      if (!node) return;
      e.preventDefault();
      if (busy) return;
      if (onSubmit) onSubmit();
      else node.closest("form")?.requestSubmit();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onSubmit]);

  return (
    <div
      ref={ref}
      className="sticky bottom-0 z-30 -mx-4 mt-4 flex flex-col-reverse gap-3 border-t border-[#D5DEDD] bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:-mx-6 sm:flex-row sm:items-center sm:justify-end sm:px-6"
    >
      {children && (
        <div className="min-w-0 flex-1 text-[13px] font-medium text-[#3B4759]/70">{children}</div>
      )}
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
          className={`${adminBtnSecondary} h-11 w-full min-w-0 sm:h-11 sm:w-auto sm:min-w-[120px]`}
        >
          {cancelLabel}
        </Button>
      )}
      <Button
        type={onSubmit ? "button" : "submit"}
        onClick={onSubmit}
        disabled={busy}
        className={`${adminBtnPrimary} h-11 w-full min-w-0 sm:h-11 sm:w-auto sm:min-w-[140px]`}
      >
        {submitting ? savingLabel : submitLabel}
      </Button>
    </div>
  );
}