import { hasRoleCached, requireRole, type RoleContext } from "@/lib/role-guard";

export async function assertAdmin(context: RoleContext): Promise<void> {
  await requireRole(context, "admin");
}

// Allows admin OR provider. Returns which one so callers can scope a provider to their own
// assigned rows while letting admins act on anything.
export async function assertReviewer(context: RoleContext): Promise<"admin" | "provider"> {
  if (await hasRoleCached(context, "admin")) return "admin";
  if (await hasRoleCached(context, "provider")) return "provider";
  throw new Error("Forbidden");
}
