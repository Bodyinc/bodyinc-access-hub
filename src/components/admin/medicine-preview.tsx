import { useState } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice, type MedicineFormValues } from "@/lib/medicines.schema";

export type MedicinePreviewProps = {
  name?: string;
  short_description?: string;
  long_description?: string;
  image_url?: string;
  price_monthly?: number;
  important_info?: MedicineFormValues["important_info"];
  notice_text?: string;
};

export function MedicinePreview({
  name = "",
  short_description = "",
  long_description = "",
  image_url = "",
  price_monthly = 0,
  important_info = [],
  notice_text = "",
}: MedicinePreviewProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const displayName = name.trim() || "Medicine name";
  const displayShort = short_description.trim() || "Short description appears here";
  const displayLong =
    long_description?.trim() ||
    "The full description will appear here when patients tap Learn More.";
  const bullets = (important_info ?? [])
    .map((b) => (typeof b === "string" ? b : b?.text)?.trim())
    .filter(Boolean) as string[];
  const monthly = Number(price_monthly);
  const displayPrice = monthly > 0 && !Number.isNaN(monthly) ? formatPrice(monthly) : "$—/mo";

  return (
    <Card className="border border-brand-border bg-white rounded-xl shadow-sm overflow-hidden w-full">
      <CardHeader className="border-b border-brand-border bg-white p-6">
        <CardTitle className="text-[20px] font-bold text-brand">Patient preview</CardTitle>
        <CardDescription className="text-[14px] text-brand-strong/80 font-medium">
          Medication card and Learn More modal.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <p className="text-[14px] font-bold text-brand">
          Select Your Medication
        </p>

        <div className="rounded-xl border border-brand-border bg-white p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {image_url ? (
              <div className="h-28 w-28 shrink-0 rounded-xl bg-brand-border/40 overflow-hidden flex items-center justify-center p-2">
                <img
                  src={image_url}
                  alt=""
                  className="h-full w-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-brand-border/30 border border-brand-border text-[13px] font-medium text-brand-strong/60">
                Image
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col justify-between h-full w-full">
              <div>
                <h3 className="text-[18px] font-bold text-brand leading-snug">{displayName}</h3>
                <p className="mt-1 text-[14px] font-medium text-brand-strong/80 line-clamp-2 leading-normal">{displayShort}</p>
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-2 w-full">
                <div className="text-[15px] font-medium text-brand">
                  From <span className="font-bold text-[18px]">{displayPrice}</span>
                </div>
                <button
                  type="button"
                  className="text-[14px] font-bold text-brand-strong underline hover:text-brand transition-colors pb-0.5"
                  onClick={() => setModalOpen(true)}
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md rounded-xl border border-brand-border bg-white p-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-[20px] font-bold text-brand">{displayName}</DialogTitle>
              <DialogDescription className="text-[14px] text-brand-strong/80 font-medium">{displayShort}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-2">
              {image_url && (
                <div className="mx-auto h-36 w-36 rounded-xl bg-brand-border/40 flex items-center justify-center p-3">
                  <img
                    src={image_url}
                    alt=""
                    className="h-full w-full object-contain rounded-lg"
                  />
                </div>
              )}
              <p className="text-[14px] leading-relaxed text-brand/90 font-medium">{displayLong}</p>
              {bullets.length > 0 && (
                <ul className="space-y-2">
                  {bullets.map((text, i) => (
                    <li key={i} className="flex gap-2 text-[13px] font-medium text-brand-strong">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {notice_text?.trim() && (
                <p className="rounded-xl border border-brand-border bg-white p-3 text-[12px] font-medium text-brand-strong/90 leading-normal">
                  {notice_text.trim()}
                </p>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setModalOpen(false)}
                className="border-brand-border hover:bg-brand-surface text-brand-strong h-10 px-4 rounded-xl font-semibold text-[13px] transition-colors flex items-center gap-1.5"
              >
                <X className="h-4 w-4" /> Close preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}