// Local-only fallback for offline dev. Admin routes use questions.functions.ts (Supabase).
import type { QuestionFormValues, QuestionType } from "./questions.schema";
import { isMcqType } from "./questions.schema";

const STORAGE_KEY = "bi_intake_questions";

export type StoredQuestionOption = {
  id: string;
  label: string;
  sort_order: number;
};

export type StoredQuestion = {
  id: string;
  prompt: string;
  description?: string | null;
  question_type: QuestionType;
  sort_order: number;
  is_required: boolean;
  is_active: boolean;
  options: StoredQuestionOption[];
  created_at: string;
  updated_at: string;
};

export type ListQuestionsInput = {
  search?: string;
  type?: "all" | QuestionType;
  status?: "all" | "active" | "inactive";
};

export type ListQuestionRow = Omit<StoredQuestion, "options"> & {
  option_count: number;
};

function now() {
  return new Date().toISOString();
}

function readAll(): StoredQuestion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredQuestion[];
    return Array.isArray(parsed)
      ? parsed.map((q) => ({ ...q, description: q.description ?? null }))
      : [];
  } catch {
    return [];
  }
}

function writeAll(questions: StoredQuestion[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
}

function sortQuestions(questions: StoredQuestion[]) {
  return [...questions].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

function seedIfEmpty() {
  const existing = readAll();
  if (existing.length > 0) return existing;

  const seeded: StoredQuestion[] = [
    {
      id: crypto.randomUUID(),
      prompt: "What is your primary health goal?",
      description: "Choose the option that best matches what you want to focus on.",
      question_type: "mcq_single",
      sort_order: 0,
      is_required: true,
      is_active: true,
      options: [
        { id: crypto.randomUUID(), label: "Weight management", sort_order: 0 },
        { id: crypto.randomUUID(), label: "Hormone balance", sort_order: 1 },
        { id: crypto.randomUUID(), label: "General wellness", sort_order: 2 },
      ],
      created_at: now(),
      updated_at: now(),
    },
    {
      id: crypto.randomUUID(),
      prompt: "Please briefly describe any symptoms you are experiencing.",
      description: "Include when they started and how often they occur.",
      question_type: "short_text",
      sort_order: 1,
      is_required: false,
      is_active: true,
      options: [],
      created_at: now(),
      updated_at: now(),
    },
  ];
  writeAll(seeded);
  return seeded;
}

function toOptions(values: QuestionFormValues): StoredQuestionOption[] {
  if (!isMcqType(values.question_type)) return [];
  return (values.options ?? []).map((opt, index) => ({
    id: crypto.randomUUID(),
    label: opt.label,
    sort_order: opt.sort_order ?? index,
  }));
}

export function listQuestions(input: ListQuestionsInput = {}): ListQuestionRow[] {
  let rows = sortQuestions(seedIfEmpty());

  if (input.search) {
    const q = input.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.prompt.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    );
  }
  if (input.type && input.type !== "all") {
    rows = rows.filter((r) => r.question_type === input.type);
  }
  if (input.status === "active") {
    rows = rows.filter((r) => r.is_active);
  } else if (input.status === "inactive") {
    rows = rows.filter((r) => !r.is_active);
  }

  return rows.map(({ options, ...rest }) => ({
    ...rest,
    option_count: options.length,
  }));
}

export function getQuestion(id: string): StoredQuestion | null {
  const question = sortQuestions(seedIfEmpty()).find((q) => q.id === id);
  return question ?? null;
}

export function createQuestion(values: QuestionFormValues): { id: string } {
  const all = sortQuestions(seedIfEmpty());
  const maxOrder = all.reduce((max, q) => Math.max(max, q.sort_order), -1);
  const sortOrder = values.sort_order ?? maxOrder + 1;

  const created: StoredQuestion = {
    id: crypto.randomUUID(),
    prompt: values.prompt,
    description: values.description ?? null,
    question_type: values.question_type,
    sort_order: sortOrder,
    is_required: values.is_required ?? true,
    is_active: values.is_active ?? true,
    options: toOptions(values),
    created_at: now(),
    updated_at: now(),
  };

  writeAll([...all, created]);
  return { id: created.id };
}

export function updateQuestion(id: string, values: QuestionFormValues): { id: string } {
  const all = sortQuestions(seedIfEmpty());
  const index = all.findIndex((q) => q.id === id);
  if (index === -1) throw new Error("Question not found");

  const existing = all[index];
  const updated: StoredQuestion = {
    ...existing,
    prompt: values.prompt,
    description: values.description ?? null,
    question_type: values.question_type,
    sort_order: values.sort_order ?? existing.sort_order,
    is_required: values.is_required ?? true,
    is_active: values.is_active ?? true,
    options: toOptions(values),
    updated_at: now(),
  };

  all[index] = updated;
  writeAll(all);
  return { id };
}

export function deleteQuestion(id: string) {
  const all = readAll().filter((q) => q.id !== id);
  writeAll(all);
  return { ok: true };
}

export function setQuestionActive(id: string, is_active: boolean) {
  const all = readQuestionsRaw();
  const index = all.findIndex((q) => q.id === id);
  if (index === -1) throw new Error("Question not found");
  all[index] = { ...all[index], is_active, updated_at: now() };
  writeAll(all);
  return { ok: true };
}

function readQuestionsRaw() {
  return sortQuestions(seedIfEmpty());
}

export function moveQuestion(id: string, direction: "up" | "down") {
  const all = readQuestionsRaw();
  const index = all.findIndex((q) => q.id === id);
  if (index === -1) throw new Error("Question not found");

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= all.length) return { ok: true };

  const currentOrder = all[index].sort_order;
  all[index].sort_order = all[swapIndex].sort_order;
  all[swapIndex].sort_order = currentOrder;
  all[index].updated_at = now();
  all[swapIndex].updated_at = now();

  writeAll(all);
  return { ok: true };
}

export function getQuestionPosition(id: string): number | null {
  const sorted = readQuestionsRaw();
  const index = sorted.findIndex((q) => q.id === id);
  return index === -1 ? null : index + 1;
}
