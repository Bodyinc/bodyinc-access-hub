export const WIPE_GROUPS = [
  {
    key: "orders",
    label: "Orders & requests",
    help: "Medication requests, their status history, prescriptions and shop checkout orders.",
  },
  {
    key: "billing",
    label: "Billing & payments",
    help: "Payments, subscriptions, refunds, wallet transactions and Stripe event history.",
  },
  {
    key: "intake",
    label: "Intake sessions",
    help: "Anonymous intake sessions with their answers, eligibility results and selections.",
  },
  {
    key: "catalog",
    label: "Medicines catalog",
    help: "Medicines, variants, packages and their category assignments.",
  },
  {
    key: "categories",
    label: "Categories / goals",
    help: "Medication categories and everything linked to them.",
  },
  {
    key: "questionnaires",
    label: "Questionnaires",
    help: "Questionnaires with all their questions and answer options.",
  },
  {
    key: "rules",
    label: "Medication rules",
    help: "Incompatible / restricted medicine pair rules.",
  },
] as const;

export type WipeGroupKey = (typeof WIPE_GROUPS)[number]["key"];

// A group can only be wiped once everything referencing it is gone too.
const REQUIRES: Record<WipeGroupKey, WipeGroupKey[]> = {
  orders: [],
  billing: ["orders"],
  intake: ["orders", "billing"],
  catalog: ["orders", "billing", "intake", "rules"],
  categories: ["intake", "questionnaires", "catalog", "orders", "billing", "rules"],
  questionnaires: ["intake"],
  rules: [],
};

export function expandGroups(keys: WipeGroupKey[]): WipeGroupKey[] {
  const out = new Set<WipeGroupKey>();
  const visit = (k: WipeGroupKey) => {
    if (out.has(k)) return;
    out.add(k);
    for (const dep of REQUIRES[k]) visit(dep);
  };
  keys.forEach(visit);
  return WIPE_GROUPS.map((g) => g.key).filter((k) => out.has(k));
}

// Children first. `col` is any always-present column so we can match every row.
export const TABLES: Array<{ group: WipeGroupKey; table: string; col: string }> = [
  { group: "orders", table: "additional_payments", col: "id" },
  { group: "orders", table: "medication_request_events", col: "id" },
  { group: "orders", table: "prescriptions", col: "id" },
  { group: "orders", table: "medication_requests", col: "id" },
  { group: "orders", table: "shop_checkout_events", col: "id" },
  { group: "orders", table: "shop_checkout_order_items", col: "id" },
  { group: "orders", table: "shop_checkout_orders", col: "id" },
  { group: "billing", table: "refund_requests", col: "id" },
  { group: "billing", table: "subscription_cancellation_feedback", col: "id" },
  { group: "billing", table: "wallet_transactions", col: "id" },
  { group: "billing", table: "subscriptions", col: "id" },
  { group: "billing", table: "payments", col: "id" },
  { group: "billing", table: "stripe_events", col: "id" },
  { group: "intake", table: "intake_session_questionnaire_responses", col: "id" },
  { group: "intake", table: "intake_session_eligibility_results", col: "id" },
  { group: "intake", table: "intake_session_medicines", col: "session_id" },
  { group: "intake", table: "intake_session_categories", col: "session_id" },
  { group: "intake", table: "intake_sessions", col: "id" },
  { group: "questionnaires", table: "questionnaire_question_options", col: "id" },
  { group: "questionnaires", table: "questionnaire_questions", col: "id" },
  { group: "questionnaires", table: "questionnaire_categories", col: "questionnaire_id" },
  { group: "questionnaires", table: "questionnaires", col: "id" },
  { group: "rules", table: "medication_relationships", col: "id" },
  { group: "catalog", table: "packages", col: "id" },
  { group: "catalog", table: "medicine_variants", col: "id" },
  { group: "catalog", table: "medication_category_medicines", col: "medicine_id" },
  { group: "catalog", table: "medicines", col: "id" },
  { group: "categories", table: "medication_categories", col: "id" },
];
