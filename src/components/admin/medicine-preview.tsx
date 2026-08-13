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
import {
  CardDivider,
  medicineCard,
  medicineCardTitle,
  MedicineProductImage,
} from "@/components/admin/medicine-form-styles";

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
    <Card className={`w-full min-w-0 p-6 ${medicineCard}`}>
      <div className="space-y-2">
        <h2 className={medicineCardTitle}>Patient preview</h2>
        <p className="text-[16px] font-normal leading-snug text-[#3B4759]/70">
          Medication card and Learn More modal.
        </p>
        <CardDivider />
      </div>

      <div className="mt-5 space-y-4">
        <p className="text-[16px] font-medium text-[#152A51]">Select Your Medication</p>

        <div className="rounded-[14px] border border-[#E8EEED] bg-white p-4">
          <div className="flex min-w-0 items-start gap-4">
            {image_url ? (
              <MedicineProductImage src={image_url} alt="" size="preview" />
            ) : (
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[14px] bg-[#E8EEED] text-[12px] font-normal text-[#3B4759]/50">
                Image
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="truncate text-[16px] font-semibold leading-snug text-[#152A51]">
                {displayName}
              </h3>
              <p className="mt-1 line-clamp-2 text-[14px] font-normal leading-[140%] text-[#3B4759]/70">
                {displayShort}
              </p>
              <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
                <span className="text-[14px] font-semibold text-[#152A51]">{displayPrice}</span>
                <button
                  type="button"
                  className="shrink-0 text-[14px] font-semibold text-[#6A9B9C] transition-colors hover:text-[#5B8788]"
                  onClick={() => setModalOpen(true)}
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md rounded-[24px] border border-[#E8EEED] bg-white p-6 shadow-xl">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-[22px] font-medium leading-[34px] text-[#152A51]">
                {displayName}
              </DialogTitle>
              <DialogDescription className="text-[16px] font-normal leading-[140%] text-[#3B4759]/70">
                {displayShort}
              </DialogDescription>
            </DialogHeader>
            <div className="my-2 space-y-4">
              {image_url && <MedicineProductImage src={image_url} alt="" size="modal" />}
              <p className="text-[16px] font-normal leading-[140%] text-[#152A51]">{displayLong}</p>
              {bullets.length > 0 && (
                <ul className="space-y-2">
                  {bullets.map((text, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-[14px] font-normal leading-[140%] text-[#3B4759]/70"
                    >
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#152A51]" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {notice_text?.trim() && (
                <p className="rounded-[14px] border border-[#E8EEED] bg-[#F2F7F6] p-3 text-[14px] font-normal leading-[140%] text-[#3B4759]/70">
                  {notice_text.trim()}
                </p>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex h-[45px] items-center gap-1.5 rounded-[14px] border border-[#E8EEED] bg-white px-4 text-[14px] font-medium text-[#152A51] shadow-none transition-colors hover:bg-[#F2F7F6]"
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
