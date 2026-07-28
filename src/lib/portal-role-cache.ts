import { readSession, writeSession, removeSessionByPrefix } from "@/lib/safe-storage";

// The portal role (admin | provider) decides which console a signed-in user lands in.
// Resolving it costs an RPC round-trip on every route guard, so it is cached per user
// for the browser session and cleared on sign-out.
const PREFIX = "bi_portal_role:";

export function readCachedPortalRole(userId: string): string | null {
  return readSession(`${PREFIX}${userId}`);
}

export function cachePortalRole(userId: string, role: string | null | undefined): void {
  if (role) writeSession(`${PREFIX}${userId}`, role);
}

export function clearCachedPortalRoles(): void {
  removeSessionByPrefix(PREFIX);
}
