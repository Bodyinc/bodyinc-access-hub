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
    // Fixed layout constraints: Removed inner widths to dynamically stretch left-aligned along with the sidebar 
    <div className="space-y-6 w-full text-left">
      {/* Upper Context Branding Label Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-brand">Patient preview</h2>
        <p className="text-[14px] text-brand-strong/70 font-medium mt-1">
          Review the real-time card presentation of this medication pricing plan tier.
        </p>
      </div>

      <Card className="overflow-hidden border border-brand-border bg-white shadow-sm rounded-2xl p-2 sm:p-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-brand">Plan presentation</CardTitle>
          <CardDescription className="text-brand-strong/60 font-medium text-[13px]">
            Recommended plan layout presentation mapping exactly onto target patient dashboards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-brand-strong">
              Recommended for {displayMedicine}
            </p>
            <p className="mt-1 text-[14px] text-brand-strong/80 font-semibold">
              {duration_months}-month plan sequence
            </p>
          </div>

          {/* Main Visual Treatment Block Component */}
          <div className="relative rounded-2xl border border-brand-border bg-white/80 p-6 shadow-none">
            {is_most_popular && (
              <Badge className="absolute -top-3 left-5 bg-brand-strong hover:bg-brand-strong text-white font-bold text-[12px] px-3 py-0.5 rounded-lg shadow-none border-none normal-case tracking-normal">
                Most Popular
              </Badge>
            )}
            
            <h3 className="font-bold text-lg text-brand">{displayName}</h3>
            
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-black text-brand tracking-tight">
                {formatPrice(price)}
              </span>
              {original_price > price && (
                <span className="text-[14px] text-brand-strong/50 font-medium line-through">
                  {formatPrice(original_price)}
                </span>
              )}
            </div>
            
            <p className="mt-1 text-[13px] text-brand-strong/70 font-medium">
              Total payment context for {duration_months} month{duration_months === 1 ? "" : "s"}
            </p>

            {/* Changed from green badge to brand matching purple tone tier */}
            {savings > 0 && (
              <Badge className="mt-3 bg-brand-surface hover:bg-brand-surface text-brand-strong border border-transparent font-bold text-[13px] px-3 py-1 rounded-xl shadow-none tracking-normal normal-case">
                Save {formatPrice(savings)}
              </Badge>
            )}

            <ul className="mt-5 space-y-3 border-t border-brand-border pt-5">
              {(filledFeatures.length > 0
                ? filledFeatures
                : ["Consultation inclusive review parameters", "Continuous automated support metrics"]
              ).map((text, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px] font-semibold text-brand">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-surface">
                    <Check className="h-3.5 w-3.5 text-brand-strong stroke-[3]" />
                  </div>
                  <span className="leading-tight">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Clinical advisory disclaimer layer blocks */}
          {clinical_note?.trim() && (
            <div className="rounded-xl border border-brand-border/60 bg-white p-4">
              <p className="text-[13px] leading-relaxed font-medium text-brand-strong/80">
                <span className="font-bold text-brand mr-1">Clinical Note:</span>
                {clinical_note.trim()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}