import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getActivePortalOffer } from "@/lib/offers.functions";

/** Active patient-portal offer, shown to admin and provider so they can share the code. */
export function StaffPromoBanner() {
  const getOffer = useServerFn(getActivePortalOffer);
  const [copied, setCopied] = useState(false);
  const offerQuery = useQuery({
    queryKey: ["active-portal-offer"],
    queryFn: () => getOffer(),
    staleTime: 60_000,
  });

  const offer = offerQuery.data;
  if (!offer) return null;

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Promo code copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the code");
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-[16px] bg-[#E8EEED] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-3.5">
      <p className="text-sm font-medium leading-snug text-[#152A51] sm:text-[15px]">
        {offer.headline}
        {offer.couponCode ? (
          <>
            {" "}
            — Use code <span className="font-semibold tracking-wide">{offer.couponCode}</span>
          </>
        ) : null}
      </p>
      {offer.couponCode ? (
        <button
          type="button"
          onClick={() => copyCode(offer.couponCode!)}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#152A51] px-5 text-sm font-medium text-white hover:bg-[#152A51]/90"
        >
          {copied ? "Copied" : "Copy code"}
        </button>
      ) : null}
    </div>
  );
}
