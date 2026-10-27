import { bmiFrom } from "@/lib/format";

export type IntakeGroup = "allergies" | "medications" | "history" | "other";

export type ClinicalAnswer = {
  id: string;
  prompt: string;
  answer: string;
  group: IntakeGroup;
  redFlag: boolean;
};

export type ClinicalIntake = {
  filled: boolean;
  goals: string[];
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  allergies: ClinicalAnswer[];
  medications: ClinicalAnswer[];
  history: ClinicalAnswer[];
  other: ClinicalAnswer[];
  red_flags: { label: string; detail: string }[];
  eligibility: {
    medicine_name: string;
    result: string;
    reason: string | null;
  }[];
};

export type PastOrder = {
  id: string;
  medicine_name: string;
  kind: string | null;
  status: string;
  created_at: string;
  notes: { id: string; body: string; created_at: string }[];
};

const EMPTY_INTAKE: ClinicalIntake = {
  filled: false,
  goals: [],
  height_cm: null,
  weight_kg: null,
  bmi: null,
  allergies: [],
  medications: [],
  history: [],
  other: [],
  red_flags: [],
  eligibility: [],
};

function groupFor(prompt: string): IntakeGroup {
  const p = prompt.toLowerCase();
  if (/allerg/.test(p)) return "allergies";
  if (/medic|supplement|drug|current treatment|prescription/.test(p)) return "medications";
  if (/histor|condition|diagnos|surg|illness|disease|past/.test(p)) return "history";
  return "other";
}

function answerValue(
  row: any,
  optMap: Map<string, { label: string; is_disqualifying?: boolean }>,
): { text: string; redFlag: boolean } {
  const chosen = ((row.answer_option_ids ?? []) as string[])
    .map((id) => optMap.get(id))
    .filter(Boolean) as { label: string; is_disqualifying?: boolean }[];
  const text =
    chosen.map((o) => o.label).join(", ") ||
    (row.answer_text ??
      (row.answer_number != null ? String(row.answer_number) : null) ??
      (row.answer_boolean != null ? (row.answer_boolean ? "Yes" : "No") : null)) ||
    "—";
  const prompt = String(row.questionnaire_questions?.prompt ?? "");
  const riskyPrompt = /contraindic|pregnan|red flag|suicid|chest pain|anaphyla/.test(
    prompt.toLowerCase(),
  );
  const affirmative = /^(yes|true)$/i.test(String(text).trim());
  const redFlag = chosen.some((o) => o.is_disqualifying) || (riskyPrompt && affirmative);
  return { text: String(text), redFlag };
}

/** True when the session has at least one submitted questionnaire answer. */
export async function filledSessionIdSet(
  supabaseAdmin: any,
  sessionIds: string[],
): Promise<Set<string>> {
  const ids = Array.from(new Set(sessionIds.filter(Boolean)));
  if (ids.length === 0) return new Set();
  const { data, error } = await supabaseAdmin
    .from("intake_session_questionnaire_responses")
    .select("session_id")
    .in("session_id", ids);
  if (error) throw new Error(error.message);
  return new Set(((data ?? []) as { session_id: string }[]).map((row) => row.session_id));
}

export async function sessionHasIntake(
  supabaseAdmin: any,
  sessionId: string | null | undefined,
): Promise<boolean> {
  if (!sessionId) return false;
  const filled = await filledSessionIdSet(supabaseAdmin, [sessionId]);
  return filled.has(sessionId);
}

export async function loadClinicalIntake(
  supabaseAdmin: any,
  sessionId: string | null | undefined,
  session?: {
    height_cm?: number | null;
    weight_kg?: number | null;
  } | null,
): Promise<ClinicalIntake> {
  if (!sessionId) return EMPTY_INTAKE;

  const [{ data: cats }, { data: elig }, { data: resp }] = await Promise.all([
    supabaseAdmin
      .from("intake_session_categories")
      .select("medication_categories(name)")
      .eq("session_id", sessionId),
    supabaseAdmin
      .from("intake_session_eligibility_results")
      .select("result, reason, evaluated_at, medicines(name)")
      .eq("session_id", sessionId)
      .order("evaluated_at", { ascending: false }),
    supabaseAdmin
      .from("intake_session_questionnaire_responses")
      .select(
        "id, answer_text, answer_number, answer_boolean, answer_option_ids, questionnaire_questions(prompt)",
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
  ]);

  const optionIds = Array.from(
    new Set(((resp ?? []) as any[]).flatMap((row) => row.answer_option_ids ?? [])),
  );
  const { data: opts } = optionIds.length
    ? await supabaseAdmin
        .from("questionnaire_question_options")
        .select("id, label, is_disqualifying")
        .in("id", optionIds)
    : { data: [] as any[] };
  const optMap = new Map<string, { label: string; is_disqualifying?: boolean }>(
    (opts ?? []).map((o: any) => [
      o.id as string,
      { label: String(o.label ?? ""), is_disqualifying: Boolean(o.is_disqualifying) },
    ]),
  );

  const answers: ClinicalAnswer[] = ((resp ?? []) as any[]).map((row) => {
    const value = answerValue(row, optMap);
    const prompt = row.questionnaire_questions?.prompt ?? "Question";
    return {
      id: row.id,
      prompt,
      answer: value.text,
      group: groupFor(prompt),
      redFlag: value.redFlag,
    };
  });

  const eligibility = ((elig ?? []) as any[]).map((row) => ({
    medicine_name: row.medicines?.name ?? "—",
    result: String(row.result ?? "—"),
    reason: (row.reason as string | null) ?? null,
  }));

  const redFlags: { label: string; detail: string }[] = [];
  for (const answer of answers) {
    if (answer.redFlag) redFlags.push({ label: answer.prompt, detail: answer.answer });
  }
  for (const row of eligibility) {
    if (row.result && row.result !== "eligible") {
      redFlags.push({
        label: `${row.medicine_name}: ${row.result}`,
        detail: row.reason ?? "Eligibility check flagged this medicine.",
      });
    }
  }

  const byGroup = (group: IntakeGroup) => answers.filter((a) => a.group === group);
  const height = session?.height_cm ?? null;
  const weight = session?.weight_kg ?? null;

  return {
    filled: answers.length > 0,
    goals: ((cats ?? []) as any[])
      .map((c) => c.medication_categories?.name)
      .filter(Boolean),
    height_cm: height,
    weight_kg: weight,
    bmi: bmiFrom(height, weight),
    allergies: byGroup("allergies"),
    medications: byGroup("medications"),
    history: byGroup("history"),
    other: byGroup("other"),
    red_flags: redFlags,
    eligibility,
  };
}

export async function loadPastOrders(
  supabaseAdmin: any,
  opts: {
    requestId: string;
    userId?: string | null;
    sessionId?: string | null;
    excludeIds?: string[];
  },
): Promise<PastOrder[]> {
  if (!opts.userId && !opts.sessionId) return [];
  const hidden = new Set([opts.requestId, ...(opts.excludeIds ?? [])]);
  let q = supabaseAdmin
    .from("medication_requests")
    .select("id, medicine_id, kind, status, created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  q = opts.userId ? q.eq("user_id", opts.userId) : q.eq("session_id", opts.sessionId);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  const list = ((rows ?? []) as any[]).filter((row) => !hidden.has(row.id)).slice(0, 20);
  if (list.length === 0) return [];

  const medIds = Array.from(new Set(list.map((row) => row.medicine_id).filter(Boolean)));
  const ids = list.map((row) => row.id);
  const [{ data: meds }, { data: notes }] = await Promise.all([
    medIds.length
      ? supabaseAdmin.from("medicines").select("id, name").in("id", medIds)
      : Promise.resolve({ data: [] as any[] }),
    supabaseAdmin
      .from("medication_request_notes")
      .select("id, request_id, body, created_at")
      .in("request_id", ids)
      .order("created_at", { ascending: true }),
  ]);
  const medMap = new Map((meds ?? []).map((m: any) => [m.id, m.name]));
  const notesByRequest = new Map<string, PastOrder["notes"]>();
  for (const note of (notes ?? []) as any[]) {
    const bucket = notesByRequest.get(note.request_id) ?? [];
    bucket.push({ id: note.id, body: note.body, created_at: note.created_at });
    notesByRequest.set(note.request_id, bucket);
  }

  return list.map((row) => ({
    id: row.id,
    medicine_name: String(medMap.get(row.medicine_id) ?? "—"),
    kind: row.kind,
    status: row.status,
    created_at: row.created_at,
    notes: notesByRequest.get(row.id) ?? [],
  }));
}
