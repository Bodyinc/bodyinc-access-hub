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

// Allows admin OR provider. Returns which one so callers can scope a provider to their own
// assigned rows while letting admins act on anything.
export async function assertReviewer(
  context: { supabase: any; userId: string },
): Promise<"admin" | "provider"> {
  const cached = adminUntil.get(context.userId);
  if (cached && cached > Date.now()) return "admin";

  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (isAdmin) {
    adminUntil.set(context.userId, Date.now() + ADMIN_CACHE_TTL_MS);
    return "admin";
  }

  const { data: isProvider } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "provider",
  });
  if (isProvider) return "provider";

  throw new Error("Forbidden");
}
