// Products paid for together are one clinical order: one queue row, one claim,
// one consultation, and a medicine list the practitioner can change line by line.

export const PURCHASE_WINDOW_MS = 10 * 60 * 1000;

export const CLOSED_ORDER_STATUSES = [
  "sent_to_pharmacy",
  "dispatched",
  "delivered",
  "rejected",
  "cancelled",
  "refunded",
];

const STATUS_RANK: Record<string, number> = {
  pending_review: 0,
  payment_completed: 1,
  provider_assigned: 2,
  awaiting_additional_payment: 3,
  approved: 4,
  prescribed: 5,
  sent_to_pharmacy: 6,
  dispatched: 7,
  delivered: 8,
  rejected: 9,
  cancelled: 10,
};

export type PurchaseRow = {
  id: string;
  user_id?: string | null;
  session_id?: string | null;
  kind?: string | null;
  created_at: string;
  order_group_id?: string | null;
  status?: string;
};

export type OrderLine = {
  id: string;
  medicine_id: string | null;
  medicine_name: string;
  variant_id: string | null;
  package_id: string | null;
  plan_name: string | null;
  status: string;
  provider_id: string | null;
  requires_consultation: boolean;
};

const SIBLING_COLS =
  "id, user_id, session_id, subscription_id, medicine_id, variant_id, package_id, provider_id, kind, status, requires_consultation, created_at, order_group_id";

function patientPurchaseKey(row: PurchaseRow): string {
  const who = row.user_id ? `u:${row.user_id}` : `s:${row.session_id ?? row.id}`;
  return `${who}|${row.kind ?? "initial"}`;
}

/** Group rows that share an order id, or the same patient and kind inside one purchase window. */
export function clusterPurchases<T extends PurchaseRow>(rows: T[]): T[][] {
  const stored = new Map<string, T[]>();
  const loose: T[] = [];
  for (const row of rows) {
    if (row.order_group_id) {
      const list = stored.get(row.order_group_id) ?? [];
      list.push(row);
      stored.set(row.order_group_id, list);
    } else {
      loose.push(row);
    }
  }
  const groups: T[][] = [...stored.values()];
  const sorted = [...loose].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const open = new Map<string, { start: number; rows: T[] }>();
  for (const row of sorted) {
    const key = patientPurchaseKey(row);
    const at = new Date(row.created_at).getTime();
    const bucket = open.get(key);
    if (!bucket || at - bucket.start > PURCHASE_WINDOW_MS) {
      if (bucket?.rows.length) groups.push(bucket.rows);
      open.set(key, { start: at, rows: [row] });
    } else {
      bucket.rows.push(row);
    }
  }
  for (const bucket of open.values()) {
    if (bucket.rows.length) groups.push(bucket.rows);
  }
  return groups;
}

export function leadOf<T extends PurchaseRow>(rows: T[]): T {
  return [...rows].sort((a, b) => {
    const ra = STATUS_RANK[a.status ?? ""] ?? 50;
    const rb = STATUS_RANK[b.status ?? ""] ?? 50;
    if (ra !== rb) return ra - rb;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  })[0];
}

export function collapseOrderRows<T extends PurchaseRow & { medicine_name?: string | null }>(
  rows: T[],
): Array<T & { medicine_name: string; item_count: number; order_item_ids: string[] }> {
  return clusterPurchases(rows)
    .map((members) => {
      const lead = leadOf(members);
      const names = [
        ...new Set(
          members
            .map((member) => member.medicine_name)
            .filter((name): name is string => Boolean(name) && name !== "—"),
        ),
      ];
      return {
        ...lead,
        medicine_name: names.join(", ") || lead.medicine_name || "—",
        item_count: members.length,
        order_item_ids: members.map((member) => member.id),
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function countPurchaseGroups<T extends PurchaseRow>(rows: T[], pred: (row: T) => boolean): number {
  return clusterPurchases(rows.filter(pred)).length;
}

function missingGroupColumn(error: { message?: string } | null) {
  return /order_group_id/i.test(error?.message ?? "");
}

export async function loadSiblingRows(supabaseAdmin: any, requestId: string): Promise<any[]> {
  let hasGroup = true;
  let currentRes = await supabaseAdmin
    .from("medication_requests")
    .select(SIBLING_COLS)
    .eq("id", requestId)
    .maybeSingle();
  if (currentRes.error && missingGroupColumn(currentRes.error)) {
    hasGroup = false;
    currentRes = await supabaseAdmin
      .from("medication_requests")
      .select(SIBLING_COLS.replace(", order_group_id", ""))
      .eq("id", requestId)
      .maybeSingle();
  }
  if (currentRes.error) throw new Error(currentRes.error.message);
  const current = currentRes.data as any;
  if (!current) return [];

  if (hasGroup && current.order_group_id) {
    const { data, error } = await supabaseAdmin
      .from("medication_requests")
      .select(SIBLING_COLS)
      .eq("order_group_id", current.order_group_id);
    if (error) throw new Error(error.message);
    return (data ?? [current]) as any[];
  }

  const at = new Date(current.created_at).getTime();
  let q = supabaseAdmin
    .from("medication_requests")
    .select(hasGroup ? SIBLING_COLS : SIBLING_COLS.replace(", order_group_id", ""))
    .eq("kind", current.kind ?? "initial")
    .gte("created_at", new Date(at - PURCHASE_WINDOW_MS).toISOString())
    .lte("created_at", new Date(at + PURCHASE_WINDOW_MS).toISOString());
  q = current.user_id ? q.eq("user_id", current.user_id) : q.eq("session_id", current.session_id);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const match = clusterPurchases((data ?? [current]) as PurchaseRow[]).find((group) =>
    group.some((row) => row.id === requestId),
  );
  return (match ?? [current]) as any[];
}

export async function loadOrderLines(supabaseAdmin: any, requestId: string): Promise<OrderLine[]> {
  const rows = await loadSiblingRows(supabaseAdmin, requestId);
  if (rows.length === 0) return [];
  const medIds = [...new Set(rows.map((row) => row.medicine_id).filter(Boolean))];
  const pkgIds = [...new Set(rows.map((row) => row.package_id).filter(Boolean))];
  const [{ data: meds }, { data: pkgs }] = await Promise.all([
    medIds.length
      ? supabaseAdmin.from("medicines").select("id, name").in("id", medIds)
      : Promise.resolve({ data: [] as any[] }),
    pkgIds.length
      ? supabaseAdmin.from("packages").select("id, name").in("id", pkgIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const medMap = new Map((meds ?? []).map((med: any) => [med.id, med.name as string]));
  const pkgMap = new Map((pkgs ?? []).map((pkg: any) => [pkg.id, pkg.name as string]));
  return [...rows]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((row) => ({
      id: row.id,
      medicine_id: row.medicine_id ?? null,
      medicine_name: String(medMap.get(row.medicine_id) ?? "—"),
      variant_id: row.variant_id ?? null,
      package_id: row.package_id ?? null,
      plan_name: row.package_id ? String(pkgMap.get(row.package_id) ?? "") || null : null,
      status: row.status,
      provider_id: row.provider_id ?? null,
      requires_consultation: Boolean(row.requires_consultation),
    }));
}

/** Patients with a consultation row that has not been closed are in chat. */
export async function userIdsInOpenChat(
  supabaseAdmin: any,
  userIds: string[],
): Promise<Set<string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Set();
  let res = await supabaseAdmin
    .from("patient_consultations")
    .select("user_id, ended_at")
    .in("user_id", ids);
  if (res.error && /ended_at/i.test(res.error.message ?? "")) {
    res = await supabaseAdmin.from("patient_consultations").select("user_id").in("user_id", ids);
  }
  if (res.error) {
    if (res.error.code === "42P01" || /patient_consultations/i.test(res.error.message ?? "")) {
      return new Set();
    }
    throw new Error(res.error.message);
  }
  const open = new Set<string>();
  for (const row of (res.data ?? []) as { user_id?: string; ended_at?: string | null }[]) {
    if (row.user_id && !row.ended_at) open.add(row.user_id);
  }
  return open;
}

export async function findGroupConsultation(supabaseAdmin: any, siblings: any[]): Promise<any | null> {
  const subIds = [...new Set(siblings.map((row) => row.subscription_id).filter(Boolean))];
  const userIds = [...new Set(siblings.map((row) => row.user_id).filter(Boolean))];
  if (subIds.length === 0 && userIds.length === 0) return null;
  const cols = "id, qb_appointment_id, qb_dialog_id, qb_user_id, subscription_id, user_id, started_at, ended_at";
  let q = supabaseAdmin.from("patient_consultations").select(cols).order("started_at", { ascending: true });
  q = subIds.length ? q.in("subscription_id", subIds) : q.in("user_id", userIds);
  let res = await q;
  if (res.error && /ended_at/i.test(res.error.message ?? "")) {
    let retry = supabaseAdmin
      .from("patient_consultations")
      .select(cols.replace(", ended_at", ""))
      .order("started_at", { ascending: true });
    retry = subIds.length ? retry.in("subscription_id", subIds) : retry.in("user_id", userIds);
    res = await retry;
  }
  if (res.error) {
    if (res.error.code === "42P01" || /patient_consultations/i.test(res.error.message ?? "")) return null;
    throw new Error(res.error.message);
  }
  const rows = (res.data ?? []) as any[];
  return rows.find((row) => row.qb_appointment_id && !row.ended_at) ?? rows.find((row) => row.qb_appointment_id) ?? null;
}
