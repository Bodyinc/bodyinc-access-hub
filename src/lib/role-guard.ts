// Role checks hit a `has_role` RPC that costs ~320ms per server-function call. Within a
// single server process a user's role can't realistically flip mid-session, so positive
// results are cached briefly. Negatives are never cached — a user who lacks a role always
// re-checks, so a freshly granted role takes effect immediately.
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;

// Structurally loose so both the auth-middleware client and the admin client satisfy it;
// the generated Supabase types narrow `rpc` to a literal union that varies per client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RoleContext = {
  supabase: { rpc: (fn: any, args: any) => PromiseLike<any> };
  userId: string;
};

const grantedUntil = new Map<string, number>();

const cacheKey = (userId: string, role: string) => `${userId}:${role}`;

/** True when the caller holds `role`. Positive results are cached per process. */
export async function hasRoleCached(context: RoleContext, role: string): Promise<boolean> {
  const key = cacheKey(context.userId, role);
  const until = grantedUntil.get(key);
  if (until && until > Date.now()) return true;

  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: role,
  });
  if (error || !data) return false;

  grantedUntil.set(key, Date.now() + ROLE_CACHE_TTL_MS);
  return true;
}

/** Throws `Forbidden` unless the caller holds `role`. */
export async function requireRole(context: RoleContext, role: string): Promise<void> {
  if (!(await hasRoleCached(context, role))) throw new Error("Forbidden");
}
