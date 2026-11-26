import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";
import { listClosedVisits, missingEndedAtColumn } from "@/lib/consultation-closed";

const PAYOUT_KEY = "provider_payouts";

export type ProviderPayoutRow = {
  provider_id: string;
  name: string;
  is_active: boolean;
  total: number;
  completed: number;
  in_progress: number;
  paid_cents: number;
};

export type ProviderPayoutEntry = {
  id: string;
  provider_id: string;
  provider_name: string;
  amount_cents: number;
  completed_count: number;
  note: string;
  paid_at: string;
};

export type ProviderPayoutSummary = {
  rate_cents: number;
  unassigned: number;
  rows: ProviderPayoutRow[];
  recent: ProviderPayoutEntry[];
};

type LedgerEntry = {
  id: string;
  provider_id: string;
  amount_cents: number;
  completed_count: number;
  note: string;
  paid_at: string;
  created_by: string;
};

type Ledger = {
  rate_cents: number;
  entries: LedgerEntry[];
};

type ConsultRow = {
  id: string;
  subscription_id: string;
  ended_at: string | null;
  started_at: string;
};

type RequestRow = {
  subscription_id: string;
  provider_id: string;
  created_at: string;
};

function emptyLedger(): Ledger {
  return { rate_cents: 0, entries: [] };
}

function parseLedger(value: unknown): Ledger {
  if (!value || typeof value !== "object") return emptyLedger();
  const raw = value as { rate_cents?: unknown; entries?: unknown };
  const rate = Number(raw.rate_cents);
  const rate_cents = Number.isFinite(rate) && rate >= 0 ? Math.min(1_000_000, Math.round(rate)) : 0;
  const entries = Array.isArray(raw.entries)
    ? raw.entries.flatMap((entry): LedgerEntry[] => {
        if (!entry || typeof entry !== "object") return [];
        const row = entry as Record<string, unknown>;
        const provider_id = typeof row.provider_id === "string" ? row.provider_id : "";
        const amount = Number(row.amount_cents);
        if (!provider_id || !Number.isFinite(amount) || amount < 0) return [];
        return [
          {
            id: typeof row.id === "string" ? row.id : crypto.randomUUID(),
            provider_id,
            amount_cents: Math.round(amount),
            completed_count: Number.isFinite(Number(row.completed_count))
              ? Math.max(0, Math.round(Number(row.completed_count)))
              : 0,
            note: typeof row.note === "string" ? row.note.slice(0, 500) : "",
            paid_at: typeof row.paid_at === "string" ? row.paid_at : new Date().toISOString(),
            created_by: typeof row.created_by === "string" ? row.created_by : "",
          },
        ];
      })
    : [];
  return { rate_cents, entries };
}

async function readLedger(supabaseAdmin: any): Promise<Ledger> {
  const { data, error } = await supabaseAdmin
    .from("platform_settings")
    .select("value")
    .eq("key", PAYOUT_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return parseLedger(data?.value);
}

async function writeLedger(supabaseAdmin: any, userId: string, ledger: Ledger) {
  const { error } = await supabaseAdmin.from("platform_settings").upsert(
    {
      key: PAYOUT_KEY,
      value: ledger,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
}

async function fetchPages(
  run: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: { message: string } | null }>,
) {
  const size = 1000;
  const rows: any[] = [];
  for (let from = 0; from < 50_000; from += size) {
    const { data, error } = await run(from, from + size - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < size) break;
  }
  return rows;
}

/** Provider on the order that existed when the visit started. Later renewals do not take the credit. */
function providerForConsult(consult: ConsultRow, requests: RequestRow[]): string | null {
  if (requests.length === 0) return null;
  const started = new Date(consult.started_at).getTime();
  const before = requests.filter((row) => new Date(row.created_at).getTime() <= started + 60_000);
  const pool = [...(before.length > 0 ? before : requests)];
  pool.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return pool[0]?.provider_id ?? null;
}

async function loadConsultRows(supabaseAdmin: any): Promise<ConsultRow[]> {
  try {
    return (await fetchPages((from, to) =>
      supabaseAdmin
        .from("patient_consultations")
        .select("id, subscription_id, ended_at, started_at")
        .order("started_at", { ascending: true })
        .range(from, to),
    )) as ConsultRow[];
  } catch (error) {
    if (!missingEndedAtColumn(error as { message?: string })) throw error;
    const rows = await fetchPages((from, to) =>
      supabaseAdmin
        .from("patient_consultations")
        .select("id, subscription_id, started_at")
        .order("started_at", { ascending: true })
        .range(from, to),
    );
    return rows.map((row) => ({ ...row, ended_at: null }));
  }
}

async function loadRequestsById(supabaseAdmin: any, ids: string[]) {
  const rows: { id: string; subscription_id: string | null; provider_id: string | null }[] = [];
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80);
    const { data, error } = await supabaseAdmin
      .from("medication_requests")
      .select("id, subscription_id, provider_id")
      .in("id", chunk);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as typeof rows));
  }
  return rows;
}

async function loadConsultationStats(supabaseAdmin: any) {
  const [consults, closed, providerRows] = await Promise.all([
    loadConsultRows(supabaseAdmin),
    listClosedVisits(supabaseAdmin),
    supabaseAdmin.from("providers").select("id"),
  ]);
  if (providerRows.error) throw new Error(providerRows.error.message);
  const providerIds = new Set((providerRows.data ?? []).map((row: { id: string }) => row.id));

  const closedRequests = await loadRequestsById(
    supabaseAdmin,
    closed.map((visit) => visit.request_id),
  );
  const requestById = new Map(closedRequests.map((row) => [row.id, row]));
  const closedSubs = new Set(
    closedRequests.map((row) => row.subscription_id).filter((id): id is string => Boolean(id)),
  );

  const subIds = [...new Set(consults.map((row) => row.subscription_id).filter(Boolean))];
  const openRequests: RequestRow[] = [];
  for (let i = 0; i < subIds.length; i += 80) {
    const chunk = subIds.slice(i, i + 80);
    const batch = (await fetchPages((from, to) =>
      supabaseAdmin
        .from("medication_requests")
        .select("subscription_id, provider_id, created_at")
        .in("subscription_id", chunk)
        .not("provider_id", "is", null)
        .order("created_at", { ascending: true })
        .range(from, to),
    )) as RequestRow[];
    openRequests.push(...batch);
  }
  const bySub = new Map<string, RequestRow[]>();
  for (const row of openRequests) {
    if (!row.subscription_id || !row.provider_id) continue;
    const list = bySub.get(row.subscription_id) ?? [];
    list.push(row);
    bySub.set(row.subscription_id, list);
  }

  const counts = new Map<string, { total: number; completed: number; in_progress: number }>();
  let unassigned = 0;
  const bump = (providerId: string | null, field: "completed" | "in_progress") => {
    if (!providerId) {
      unassigned += 1;
      return;
    }
    const bucket = counts.get(providerId) ?? { total: 0, completed: 0, in_progress: 0 };
    bucket[field] += 1;
    bucket.total += 1;
    counts.set(providerId, bucket);
  };

  const countedSubs = new Set<string>();
  for (const visit of closed) {
    const request = requestById.get(visit.request_id);
    if (!request) continue;
    const owner =
      visit.created_by && providerIds.has(visit.created_by)
        ? visit.created_by
        : (request.provider_id ?? null);
    bump(owner, "completed");
    if (request.subscription_id) countedSubs.add(request.subscription_id);
  }

  for (const consult of consults) {
    if (consult.subscription_id && countedSubs.has(consult.subscription_id)) continue;
    const owner = providerForConsult(consult, bySub.get(consult.subscription_id) ?? []);
    if (consult.ended_at || (consult.subscription_id && closedSubs.has(consult.subscription_id))) {
      bump(owner, "completed");
      if (consult.subscription_id) countedSubs.add(consult.subscription_id);
      continue;
    }
    bump(owner, "in_progress");
  }

  return { counts, unassigned };
}

function paidByProvider(entries: LedgerEntry[]) {
  const paid = new Map<string, number>();
  for (const entry of entries) {
    paid.set(entry.provider_id, (paid.get(entry.provider_id) ?? 0) + entry.amount_cents);
  }
  return paid;
}

export const listProviderPayouts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProviderPayoutSummary> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [ledger, stats, providers] = await Promise.all([
      readLedger(supabaseAdmin),
      loadConsultationStats(supabaseAdmin),
      supabaseAdmin.from("provider_directory").select("id, full_name, is_active"),
    ]);
    if (providers.error) throw new Error(providers.error.message);

    const paid = paidByProvider(ledger.entries);
    const names = new Map<string, { name: string; is_active: boolean }>();
    for (const row of providers.data ?? []) {
      if (!row.id) continue;
      names.set(row.id, {
        name: row.full_name?.trim() || "Provider",
        is_active: row.is_active !== false,
      });
    }
    for (const providerId of stats.counts.keys()) {
      if (!names.has(providerId)) names.set(providerId, { name: "Provider", is_active: false });
    }

    const rows: ProviderPayoutRow[] = [...names.entries()]
      .map(([provider_id, info]) => {
        const count = stats.counts.get(provider_id) ?? { total: 0, completed: 0, in_progress: 0 };
        return {
          provider_id,
          name: info.name,
          is_active: info.is_active,
          total: count.total,
          completed: count.completed,
          in_progress: count.in_progress,
          paid_cents: paid.get(provider_id) ?? 0,
        };
      })
      .sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));

    const recent = [...ledger.entries]
      .sort((a, b) => b.paid_at.localeCompare(a.paid_at))
      .slice(0, 12)
      .map((entry) => ({
        id: entry.id,
        provider_id: entry.provider_id,
        provider_name: names.get(entry.provider_id)?.name ?? "Provider",
        amount_cents: entry.amount_cents,
        completed_count: entry.completed_count,
        note: entry.note,
        paid_at: entry.paid_at,
      }));

    return {
      rate_cents: ledger.rate_cents,
      unassigned: stats.unassigned,
      rows,
      recent,
    };
  });

export const setProviderPayoutRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ rate_cents: z.number().int().min(0).max(1_000_000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ledger = await readLedger(supabaseAdmin);
    const before = ledger.rate_cents;
    ledger.rate_cents = data.rate_cents;
    await writeLedger(supabaseAdmin, context.userId, ledger);
    const { error: logError } = await supabaseAdmin.from("admin_activity_log").insert({
      admin_user_id: context.userId,
      action: "payout.set_rate",
      entity: "platform_settings",
      before: { rate_cents: before },
      after: { rate_cents: data.rate_cents },
    });
    if (logError) console.warn("[payouts] audit log failed:", logError.message);
    return { ok: true as const };
  });

export const recordProviderPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        provider_id: z.string().uuid(),
        amount_cents: z.number().int().min(1).max(10_000_000),
        note: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: provider, error } = await supabaseAdmin
      .from("providers")
      .select("id")
      .eq("id", data.provider_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!provider) throw new Error("Provider not found.");

    const [ledger, stats] = await Promise.all([
      readLedger(supabaseAdmin),
      loadConsultationStats(supabaseAdmin),
    ]);
    const completed = stats.counts.get(data.provider_id)?.completed ?? 0;
    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      provider_id: data.provider_id,
      amount_cents: data.amount_cents,
      completed_count: completed,
      note: data.note?.trim() ?? "",
      paid_at: new Date().toISOString(),
      created_by: context.userId,
    };
    ledger.entries.push(entry);
    await writeLedger(supabaseAdmin, context.userId, ledger);
    const { error: logError } = await supabaseAdmin.from("admin_activity_log").insert({
      admin_user_id: context.userId,
      action: "payout.record",
      entity: "providers",
      entity_id: data.provider_id,
      after: {
        amount_cents: entry.amount_cents,
        completed_count: completed,
        note: entry.note || null,
      },
    });
    if (logError) console.warn("[payouts] audit log failed:", logError.message);
    return { ok: true as const };
  });
