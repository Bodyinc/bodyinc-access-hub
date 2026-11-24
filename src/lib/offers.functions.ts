import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin, assertReviewer } from "@/lib/admin-guard";

const offerBase = z.object({
  promo_code_id: z.string().uuid().nullable().optional(),
  headline: z.string().trim().min(1).max(300),
  badge_text: z.string().trim().max(80).nullable().optional(),
  cta_label: z.string().trim().min(1).max(80).default("View Treatment Details"),
  cta_href: z.string().trim().min(1).max(500).default("/shop"),
  is_active: z.boolean().default(true),
  starts_at: z.string().trim().min(1).nullable().optional(),
  ends_at: z.string().trim().min(1).nullable().optional(),
  sort_order: z.number().int().default(0),
});

type OfferBaseValues = z.infer<typeof offerBase>;

const offerInput = offerBase;
const offerUpdateInput = offerBase.extend({ id: z.string().uuid() });

function emptyToNull(v: string | null | undefined) {
  if (v == null) return null;
  const t = v.trim();
  return t ? t : null;
}

function toRow(data: OfferBaseValues) {
  return {
    promo_code_id: data.promo_code_id ?? null,
    headline: data.headline.trim(),
    badge_text: emptyToNull(data.badge_text),
    cta_label: data.cta_label.trim() || "View Treatment Details",
    cta_href: data.cta_href.trim() || "/shop",
    is_active: data.is_active,
    starts_at: emptyToNull(data.starts_at),
    ends_at: emptyToNull(data.ends_at),
    sort_order: data.sort_order ?? 0,
  };
}

export type PortalOfferRow = {
  id: string;
  promo_code_id: string | null;
  headline: string;
  badge_text: string | null;
  cta_label: string;
  cta_href: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  promo_codes: { id: string; code: string } | null;
};

export const listOffers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PortalOfferRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("portal_offers")
      .select("*, promo_codes(id, code)")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as PortalOfferRow[];
  });

export const createOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => offerInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin
      .from("portal_offers")
      .insert(toRow(data))
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const updateOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => offerUpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const { error } = await supabaseAdmin.from("portal_offers").update(toRow(rest)).eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  });

export const setOfferActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("portal_offers")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { backupThen, fetchMatching, newBackupId } = await import("@/lib/data-backup.server");
    const db = supabaseAdmin as any;
    const rows = await fetchMatching(db, "portal_offers", "id", [data.id]);
    await backupThen(
      db,
      {
        wipeId: newBackupId(),
        group: "offer",
        wipedBy: context.userId,
        label: rows[0]?.headline?.trim() || "Offer",
        batches: [{ table: "portal_offers", rows }],
      },
      async () => {
        const { error } = await supabaseAdmin.from("portal_offers").delete().eq("id", data.id);
        if (error) throw new Error(error.message);
      },
    );
    return { ok: true };
  });

export type ActivePortalOffer = {
  headline: string;
  couponCode: string | null;
};

type OfferWindowRow = {
  headline: string;
  promo_code_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

type PromoDisplayRow = {
  code: string;
  is_active: boolean;
  redeem_by: string | null;
  max_redemptions: number | null;
  times_redeemed: number;
};

/** Same window as the patient portal: from starts_at through the end of the ends_at day (UTC). */
function isWithinOfferWindow(
  startsAt: string | null,
  endsAt: string | null,
  nowMs: number,
): boolean {
  if (startsAt && new Date(startsAt).getTime() > nowMs) return false;
  if (endsAt) {
    const end = new Date(endsAt);
    const endOfDayMs = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate(),
      23,
      59,
      59,
      999,
    );
    if (endOfDayMs < nowMs) return false;
  }
  return true;
}

function isPromoDisplayable(promo: PromoDisplayRow): boolean {
  if (!promo.is_active) return false;
  if (promo.redeem_by && new Date(promo.redeem_by) <= new Date()) return false;
  if (promo.max_redemptions != null && (promo.times_redeemed ?? 0) >= promo.max_redemptions) {
    return false;
  }
  return true;
}

/** The offer currently shown to patients, so staff see the same headline and code. */
export const getActivePortalOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivePortalOffer | null> => {
    await assertReviewer(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("portal_offers")
      .select("headline, promo_code_id, starts_at, ends_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    const nowMs = Date.now();
    const row = ((data ?? []) as OfferWindowRow[]).find((candidate) =>
      isWithinOfferWindow(candidate.starts_at, candidate.ends_at, nowMs),
    );
    const headline = row?.headline.trim() ?? "";
    if (!row || !headline) return null;

    let couponCode: string | null = null;
    if (row.promo_code_id) {
      const { data: promo, error: promoError } = await supabaseAdmin
        .from("promo_codes")
        .select("code, is_active, redeem_by, max_redemptions, times_redeemed")
        .eq("id", row.promo_code_id)
        .maybeSingle();
      if (promoError) throw new Error(promoError.message);
      if (promo && isPromoDisplayable(promo as PromoDisplayRow)) {
        couponCode = promo.code?.trim() || null;
      }
    }

    return { headline, couponCode };
  });
