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
    <Card className="w-full min-w-0 rounded-xl border border-[#EAE6FA] bg-white p-4 shadow-none sm:p-5">
      <div className="space-y-2">
        <h2 className="text-[20px] font-semibold leading-[100%] tracking-normal text-[#2E00AB]">
          Patient preview
        </h2>
        <p className="text-[16px] font-normal leading-[100%] tracking-normal text-[#2E00AB]/80">
          Medication card and Learn More modal.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <p className="text-[16px] font-medium leading-[100%] text-[#2E00AB]">
          Select Your Medication
        </p>

        <div className="rounded-[12px] border border-[#EAE6FA] bg-[#FAF9FF] p-3 sm:p-4">
          <div className="flex min-w-0 items-start gap-3">
            {image_url ? (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[#EAE6FA] bg-[#EAE4FF] p-1.5 sm:h-16 sm:w-16">
                <img
                  src={image_url}
                  alt=""
                  className="h-full w-full rounded-[6px] object-contain"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] border border-[#EAE6FA] bg-[#EAE4FF] text-[12px] font-normal text-[#2E00AB]/60 sm:h-16 sm:w-16">
                Image
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="truncate text-[15px] font-semibold leading-[120%] text-[#2E00AB] sm:text-[16px]">
                {displayName}
              </h3>
              <p className="mt-1 line-clamp-2 text-[13px] font-normal leading-[140%] text-[#2E00AB]/80 sm:text-[14px]">
                {displayShort}
              </p>
              <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="min-w-0 text-[13px] font-semibold leading-[100%] text-[#2E00AB] sm:text-[14px]">
                  {displayPrice}
                </span>
                <button
                  type="button"
                  className="shrink-0 whitespace-nowrap text-[13px] font-semibold leading-[100%] text-[#2E00AB] underline transition-colors hover:text-[#25008A] sm:text-[14px]"
                  onClick={() => setModalOpen(true)}
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md rounded-[12px] border border-[#EAE6FA] bg-white p-6 shadow-xl">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-[20px] font-semibold leading-[100%] text-[#2E00AB]">
                {displayName}
              </DialogTitle>
              <DialogDescription className="text-[16px] font-normal leading-[140%] text-[#2E00AB]/80">
                {displayShort}
              </DialogDescription>
            </DialogHeader>
            <div className="my-2 space-y-4">
              {image_url && (
                <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-[10px] border border-[#EAE6FA] bg-[#EAE4FF] p-3">
                  <img
                    src={image_url}
                    alt=""
                    className="h-full w-full rounded-[6px] object-contain"
                  />
                </div>
              )}
              <p className="text-[16px] font-normal leading-[140%] text-[#2E00AB]">
                {displayLong}
              </p>
              {bullets.length > 0 && (
                <ul className="space-y-2">
                  {bullets.map((text, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-[14px] font-normal leading-[140%] text-[#2E00AB]/80"
                    >
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2E00AB]" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {notice_text?.trim() && (
                <p className="rounded-[10px] border border-[#EAE6FA] bg-[#FAF9FF] p-3 text-[14px] font-normal leading-[140%] text-[#2E00AB]/80">
                  {notice_text.trim()}
                </p>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex h-10 items-center gap-1.5 rounded-[8px] border border-[#EAE6FA] bg-white px-4 text-[14px] font-medium text-[#2E00AB] shadow-none transition-colors hover:bg-[#FAF9FF]"
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
