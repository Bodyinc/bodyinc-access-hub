// Shared admin guard with a short-lived in-memory cache: every serverFn call was
// paying a ~320ms has_role RPC; within one server process an admin's role can't
// realistically flip mid-session, so cache positives briefly. Negatives are never
// cached — a non-admin always re-checks.
const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000;
const adminUntil = new Map<string, number>();

export async function assertAdmin(context: { supabase: any; userId: string }) {
  const cached = adminUntil.get(context.userId);
  if (cached && cached > Date.now()) return;

  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
  adminUntil.set(context.userId, Date.now() + ADMIN_CACHE_TTL_MS);
}
