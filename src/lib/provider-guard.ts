// Guard for the practitioner portal: the caller must hold the `provider` role.
// Admins are deliberately NOT allowed through — they have their own console, and
// provider-scoped reads assume `provider_id = auth.uid()`.
const PROVIDER_CACHE_TTL_MS = 5 * 60 * 1000;
const providerUntil = new Map<string, number>();

export async function assertProvider(context: { supabase: any; userId: string }): Promise<string> {
  const cached = providerUntil.get(context.userId);
  if (cached && cached > Date.now()) return context.userId;

  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "provider",
  });
  if (error || !data) throw new Error("Forbidden");
  providerUntil.set(context.userId, Date.now() + PROVIDER_CACHE_TTL_MS);
  return context.userId;
}
