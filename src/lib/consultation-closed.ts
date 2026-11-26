/** A visit is closed when Finish consultation writes this timeline note. */
export function isConsultationClosedNote(note: string | null | undefined) {
  return (note ?? "").trim().toLowerCase().startsWith("consultation completed");
}

export function missingEndedAtColumn(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? "";
  return error?.code === "42703" || /ended_at/i.test(message);
}

export type ClosedVisit = {
  request_id: string;
  closed_at: string;
  created_by: string | null;
};

async function pageRows(
  run: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: any[] | null; error: { message: string; code?: string } | null }>,
) {
  const size = 1000;
  const rows: any[] = [];
  for (let from = 0; from < 50_000; from += size) {
    const { data, error } = await run(from, from + size - 1);
    if (error) throw Object.assign(new Error(error.message), { code: error.code });
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < size) break;
  }
  return rows;
}

/** One row per order, using the first time Finish consultation was clicked. */
export async function listClosedVisits(db: any): Promise<ClosedVisit[]> {
  const rows = await pageRows((from, to) =>
    db
      .from("medication_request_events")
      .select("request_id, created_at, created_by, note")
      .ilike("note", "Consultation completed%")
      .order("created_at", { ascending: true })
      .range(from, to),
  );
  const byRequest = new Map<string, ClosedVisit>();
  for (const row of rows) {
    if (!row.request_id || !isConsultationClosedNote(row.note)) continue;
    const prev = byRequest.get(row.request_id);
    if (!prev || String(row.created_at) < prev.closed_at) {
      byRequest.set(row.request_id, {
        request_id: row.request_id,
        closed_at: row.created_at,
        created_by: row.created_by ?? null,
      });
    }
  }
  return [...byRequest.values()];
}

export async function closedAtByRequestId(db: any, requestIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(requestIds.filter(Boolean))];
  const closed = new Map<string, string>();
  if (ids.length === 0) return closed;
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80);
    const { data, error } = await db
      .from("medication_request_events")
      .select("request_id, created_at, note")
      .in("request_id", chunk)
      .ilike("note", "Consultation completed%");
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (!isConsultationClosedNote(row.note)) continue;
      const prev = closed.get(row.request_id);
      if (!prev || String(row.created_at) < prev) closed.set(row.request_id, row.created_at);
    }
  }
  return closed;
}
