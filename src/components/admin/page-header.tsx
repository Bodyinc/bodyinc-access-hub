import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { adminPageTitle } from "@/lib/admin-ui";

export type Crumb = { label: string; to?: string };

export type PageHeaderProps = {
  /** Parent route to go back to, e.g. "/admin/medicines". */
  backTo?: string;
  /** Label for the back link — defaults to the last linked crumb. */
  backLabel?: string;
  title: string;
  subtitle?: string;
  /** Breadcrumb trail, excluding the current page. */
  crumbs?: Crumb[];
  actions?: ReactNode;
};

/**
 * Shared header for inner admin / practitioner pages: back link, breadcrumbs,
 * title and an optional actions slot on the right.
 */
export function PageHeader({
  backTo,
  backLabel,
  title,
  subtitle,
  crumbs,
  actions,
}: PageHeaderProps) {
  const trail = crumbs ?? [];
  const fallbackBackLabel = backLabel ?? [...trail].reverse().find((c) => c.to)?.label ?? "Back";

  return (
    <div className="mb-5 space-y-3 sm:mb-6">
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#6A9B9C] transition-colors hover:text-[#3B4759]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {fallbackBackLabel.toLowerCase()}
        </Link>
      )}

      {trail.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[13px]">
          {trail.map((c) => (
            <span key={`${c.label}-${c.to ?? ""}`} className="flex items-center gap-1">
              {c.to ? (
                <Link
                  to={c.to}
                  className="font-medium text-[#3B4759]/60 transition-colors hover:text-[#3B4759]"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="font-medium text-[#3B4759]/60">{c.label}</span>
              )}
              <ChevronRight className="h-3.5 w-3.5 text-[#3B4759]/30" />
            </span>
          ))}
          <span className="font-semibold text-[#3B4759]">{title}</span>
        </nav>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className={adminPageTitle}>{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] font-normal text-[#3B4759]/70">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
