import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { questionFormSchema, updateQuestionSchema, QUESTION_TYPES, isMcqType } from "./questions.schema";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

const listInput = z
  .object({
    search: z.string().trim().max(200).optional(),
    type: z.enum(["all", ...QUESTION_TYPES]).default("all"),
    status: z.enum(["all", "active", "inactive"]).default("all"),
  })
  .default({ type: "all", status: "all" });

const idInput = z.object({ id: z.string().uuid() });

export const listQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let query = context.supabase
      .from("intake_questions")
      .select(
        "id, prompt, description, question_type, sort_order, is_required, is_active, created_at, intake_question_options(id)",
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (data.search) {
      const term = `%${data.search}%`;
      query = query.or(`prompt.ilike.${term},description.ilike.${term}`);
    }
    if (data.type !== "all") {
      query = query.eq("question_type", data.type);
    }
    if (data.status === "active") {
      query = query.eq("is_active", true);
    } else if (data.status === "inactive") {
      query = query.eq("is_active", false);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row: any) => {
      const { intake_question_options, ...rest } = row;
      return {
        ...rest,
        option_count: Array.isArray(intake_question_options)
          ? intake_question_options.length
          : 0,
      };
    });
  });

export const getQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const [questionResult, orderResult] = await Promise.all([
      context.supabase
        .from("intake_questions")
        .select(
          "id, prompt, description, question_type, sort_order, is_required, is_active, created_at, intake_question_options(id, label, sort_order)",
        )
        .eq("id", data.id)
        .order("sort_order", { referencedTable: "intake_question_options", ascending: true })
        .maybeSingle(),
      context.supabase
        .from("intake_questions")
        .select("id")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    const { data: question, error } = questionResult;
    if (error) throw new Error(error.message);
    if (!question) throw new Error("Question not found");

    if (orderResult.error) throw new Error(orderResult.error.message);
    const index = (orderResult.data ?? []).findIndex((r) => r.id === data.id);
    return { ...question, position: index === -1 ? null : index + 1 };
  });

export const getQuestionPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("intake_questions")
      .select("id")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    const index = (rows ?? []).findIndex((r) => r.id === data.id);
    return index === -1 ? null : index + 1;
  });

async function insertOptions(
  supabase: any,
  questionId: string,
  options: { label: string; sort_order?: number }[],
) {
  if (options.length === 0) return;
  const rows = options.map((opt, index) => ({
    question_id: questionId,
    label: opt.label,
    sort_order: opt.sort_order ?? index,
  }));
  const { error } = await supabase.from("intake_question_options").insert(rows);
  if (error) throw new Error(error.message);
}

async function nextSortOrder(supabase: any) {
  const { data, error } = await supabase
    .from("intake_questions")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.sort_order ?? -1) + 1;
}

export const createQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => questionFormSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const options = isMcqType(data.question_type) ? (data.options ?? []) : [];
    const sortOrder =
      data.sort_order && data.sort_order > 0
        ? data.sort_order
        : await nextSortOrder(context.supabase);

    const { data: created, error } = await context.supabase
      .from("intake_questions")
      .insert({
        prompt: data.prompt,
        description: data.description ?? null,
        question_type: data.question_type,
        sort_order: sortOrder,
        is_required: data.is_required,
        is_active: data.is_active,
      })
      .select("id")
      .single();

    if (error || !created) throw new Error(error?.message ?? "Failed to create question");
    await insertOptions(context.supabase, created.id, options);
    return { id: created.id };
  });

export const updateQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateQuestionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const options = isMcqType(data.question_type) ? (data.options ?? []) : [];

    const { error } = await context.supabase
      .from("intake_questions")
      .update({
        prompt: data.prompt,
        description: data.description ?? null,
        question_type: data.question_type,
        sort_order: data.sort_order,
        is_required: data.is_required,
        is_active: data.is_active,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    const { error: deleteError } = await context.supabase
      .from("intake_question_options")
      .delete()
      .eq("question_id", data.id);
    if (deleteError) throw new Error(deleteError.message);

    await insertOptions(context.supabase, data.id, options);
    return { id: data.id };
  });

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("intake_questions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setQuestionActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("intake_questions")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moveQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), direction: z.enum(["up", "down"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("intake_questions")
      .select("id, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const index = list.findIndex((r) => r.id === data.id);
    if (index === -1) throw new Error("Question not found");

    const swapIndex = data.direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return { ok: true };

    const current = list[index];
    const neighbor = list[swapIndex];

    const { error: e1 } = await context.supabase
      .from("intake_questions")
      .update({ sort_order: neighbor.sort_order })
      .eq("id", current.id);
    if (e1) throw new Error(e1.message);

    const { error: e2 } = await context.supabase
      .from("intake_questions")
      .update({ sort_order: current.sort_order })
      .eq("id", neighbor.id);
    if (e2) throw new Error(e2.message);

    return { ok: true };
  });
