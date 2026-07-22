import { useState } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFromPrice, type MedicineFormValues } from "@/lib/medicines.schema";

export type MedicinePreviewProps = {
  name?: string;
  short_description?: string;
  long_description?: string;
  image_url?: string;
  from_price_cents?: number | null;
  important_info?: MedicineFormValues["important_info"];
  notice_text?: string;
};

export function MedicinePreview({
  name = "",
  short_description = "",
  long_description = "",
  image_url = "",
  from_price_cents = null,
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
  const displayPrice = formatFromPrice(from_price_cents);

  return (
    <Card className="border border-[#EAE6FA] bg-white rounded-xl shadow-none overflow-hidden p-6 space-y-6 w-full">
      {/* Title Header matching the left card structure */}
      <div className="space-y-1">
        <h2 className="text-[22px] font-bold text-[#1D0087]">
          Patient preview
        </h2>
        <p className="text-[14px] font-normal text-[#5527E7]/80">
          Medication card and Learn More modal.
        </p>
      </div>

      <div className="space-y-4 pt-2">
        <p className="text-[14px] font-semibold text-[#1D0087]">
          Select Your Medication
        </p>

        <div className="rounded-2xl border border-[#EDEAFB] bg-[#FAF9FF] p-4">
          <div className="flex gap-4 items-center">
            {image_url ? (
              <div className="h-20 w-20 shrink-0 rounded-xl bg-[#EAE4FF] border border-[#EDEAFB] overflow-hidden flex items-center justify-center p-2">
                <img
                  src={image_url}
                  alt=""
                  className="h-full w-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#EAE4FF] border border-[#EDEAFB] text-[13px] font-medium text-[#5527E7]/60">
                Image
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col justify-between h-full w-full">
              <div>
                <h3 className="text-[16px] font-semibold text-[#1D0087] leading-snug truncate">
                  {displayName}
                </h3>
                <p className="mt-0.5 text-[13px] font-normal text-[#5140AB] line-clamp-2 leading-tight">
                  {displayShort}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 w-full">
                <div className="text-[13px] font-normal text-[#1D0087] shrink-0">
                  <span className="font-semibold text-[14px]">{displayPrice}</span>
                </div>
                <button
                  type="button"
                  className="text-[13px] font-semibold text-[#5527E7] underline hover:text-[#1D0087] transition-colors whitespace-nowrap shrink-0"
                  onClick={() => setModalOpen(true)}
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal View */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-[#EDEAFB] bg-white p-6 shadow-xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-[20px] font-semibold text-[#1D0087]">
                {displayName}
              </DialogTitle>
              <DialogDescription className="text-[14px] text-[#5527E7]/80 font-normal">
                {displayShort}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-2">
              {image_url && (
                <div className="mx-auto h-36 w-36 rounded-xl bg-[#EAE4FF] border border-[#EDEAFB] flex items-center justify-center p-3">
                  <img
                    src={image_url}
                    alt=""
                    className="h-full w-full object-contain rounded-lg"
                  />
                </div>
              )}
              <p className="text-[14px] leading-relaxed text-[#1D0087]/90 font-normal">
                {displayLong}
              </p>
              {bullets.length > 0 && (
                <ul className="space-y-2">
                  {bullets.map((text, i) => (
                    <li key={i} className="flex gap-2 text-[13px] font-normal text-[#5527E7]">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1D0087]" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {notice_text?.trim() && (
                <p className="rounded-xl border border-[#EDEAFB] bg-[#FAF9FF] p-3 text-[12px] font-normal text-[#5140AB] leading-normal">
                  {notice_text.trim()}
                </p>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-[#EDEAFB] bg-white hover:bg-[#FAF9FF] text-[#5527E7] h-10 px-4 rounded-lg font-medium text-[13px] transition-colors flex items-center gap-1.5 shadow-none"
              >
                <X className="h-4 w-4" /> Close preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}