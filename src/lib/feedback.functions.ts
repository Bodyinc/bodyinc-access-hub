import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";

export type PatientFeedbackRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  category: string;
  message: string;
  page_path: string | null;
  created_at: string;
};

const listInput = z
  .object({
    search: z.string().trim().max(200).optional(),
  })
  .default({});

export const listPatientFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<PatientFeedbackRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("patient_feedback")
      .select("id, user_id, email, full_name, category, message, page_path, created_at")
      .order("created_at", { ascending: false })
      .limit(300);

    if (data.search) {
      const s = `%${data.search.replace(/[,()%]/g, " ")}%`;
      q = q.or(`full_name.ilike.${s},email.ilike.${s},message.ilike.${s},page_path.ilike.${s}`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as PatientFeedbackRow[];
  });
