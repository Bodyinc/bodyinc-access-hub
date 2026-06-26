import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { computeSavings, formatPrice, type PackageFormValues } from "@/lib/packages.schema";

export type PackagePreviewProps = {
  medicine_name?: string;
  name?: string;
  duration_months?: number;
  original_price?: number;
  price?: number;
  is_most_popular?: boolean;
  features?: PackageFormValues["features"];
  clinical_note?: string;
};

export function PackagePreview({
  medicine_name = "",
  name = "",
  duration_months = 1,
  original_price = 0,
  price = 0,
  is_most_popular = false,
  features = [],
  clinical_note = "",
}: PackagePreviewProps) {
  const displayName = name.trim() || "Plan name";
  const displayMedicine = medicine_name.trim() || "Medicine";
  const filledFeatures = (features ?? []).map((f) => f.text?.trim()).filter(Boolean);
  const savings = computeSavings(original_price ?? 0, price ?? 0);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Patient preview</CardTitle>
        <CardDescription>Recommended medications plan card.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recommended for {displayMedicine}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {duration_months}-month plan
          </p>
        </div>

        <div className="relative rounded-xl border-2 border-primary/20 bg-background p-5 shadow-sm">
          {is_most_popular && (
            <Badge className="absolute -top-2.5 left-4">Most Popular</Badge>
          )}
          <h3 className="font-semibold">{displayName}</h3>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{formatPrice(price)}</span>
            {original_price > price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(original_price)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Total for {duration_months} month{duration_months === 1 ? "" : "s"}
          </p>
          {savings > 0 && (
            <Badge variant="secondary" className="mt-2 font-normal">
              Save {formatPrice(savings)}
            </Badge>
          )}
          <ul className="mt-4 space-y-2">
            {(filledFeatures.length > 0
              ? filledFeatures
              : ["Feature one", "Feature two"]
            ).map((text, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {clinical_note?.trim() && (
          <p className="text-xs text-muted-foreground">{clinical_note.trim()}</p>
        )}
      </CardContent>
    </Card>
  );
}
