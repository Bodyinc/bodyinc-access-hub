import { useState } from "react";
import { Info, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Patient preview</CardTitle>
        <CardDescription>Medication card and Learn More modal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Select Your Medication
        </p>

        <div className="rounded-xl border bg-background p-4 shadow-sm">
          <div className="flex gap-4">
            {image_url ? (
              <img
                src={image_url}
                alt=""
                className="h-28 w-20 shrink-0 rounded-lg object-contain"
              />
            ) : (
              <div className="flex h-28 w-20 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                Image
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <h3 className="font-semibold leading-tight">{displayName}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{displayShort}</p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Badge variant="secondary" className="font-normal">
                  From {displayPrice}
                </Badge>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => setModalOpen(true)}
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{displayName}</DialogTitle>
              <DialogDescription>{displayShort}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {image_url && (
                <img
                  src={image_url}
                  alt=""
                  className="mx-auto h-36 w-auto object-contain"
                />
              )}
              <p className="text-sm leading-relaxed text-muted-foreground">{displayLong}</p>
              {bullets.length > 0 && (
                <ul className="space-y-2">
                  {bullets.map((text, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {notice_text?.trim() && (
                <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  {notice_text.trim()}
                </p>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              <X className="mr-1.5 h-4 w-4" /> Close preview
            </Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
