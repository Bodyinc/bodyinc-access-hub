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
    <Card className="border border-[#EDEAFB] bg-white rounded-2xl shadow-none overflow-hidden w-full antialiased">
      <CardHeader className="border-b border-[#EDEAFB] bg-white p-6">
        <CardTitle className="text-[20px] font-semibold text-[#1D0087]">Patient preview</CardTitle>
        <CardDescription className="text-[14px] text-[#5527E7]/80 font-normal">
          Medication card and Learn More modal.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <p className="text-[14px] font-semibold text-[#1D0087]">
          Select Your Medication
        </p>

        <div className="rounded-2xl border border-[#EDEAFB] bg-[#FAF9FF] p-5">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
            {image_url ? (
              <div className="h-28 w-28 shrink-0 rounded-xl bg-white border border-[#EDEAFB] overflow-hidden flex items-center justify-center p-2">
                <img
                  src={image_url}
                  alt=""
                  className="h-full w-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-white border border-[#EDEAFB] text-[13px] font-medium text-[#5527E7]/60">
                Image
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col justify-between h-full w-full">
              <div>
                <h3 className="text-[18px] font-semibold text-[#1D0087] leading-snug">{displayName}</h3>
                <p className="mt-1 text-[14px] font-normal text-[#5140AB] line-clamp-2 leading-normal">{displayShort}</p>
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-2 w-full">
                <div className="text-[14px] font-normal text-[#1D0087]">
                  <span className="font-semibold text-[16px]">{displayPrice}</span>
                </div>
                <button
                  type="button"
                  className="text-[14px] font-semibold text-[#5527E7] underline hover:text-[#1D0087] transition-colors pb-0.5"
                  onClick={() => setModalOpen(true)}
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal View matching reference specifications */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-[#EDEAFB] bg-white p-6 shadow-xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-[20px] font-semibold text-[#1D0087]">{displayName}</DialogTitle>
              <DialogDescription className="text-[14px] text-[#5527E7]/80 font-normal">{displayShort}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-2">
              {image_url && (
                <div className="mx-auto h-36 w-36 rounded-xl bg-white border border-[#EDEAFB] flex items-center justify-center p-3">
                  <img
                    src={image_url}
                    alt=""
                    className="h-full w-full object-contain rounded-lg"
                  />
                </div>
              )}
              <p className="text-[14px] leading-relaxed text-[#1D0087]/90 font-normal">{displayLong}</p>
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
      </CardContent>
    </Card>
  );
}