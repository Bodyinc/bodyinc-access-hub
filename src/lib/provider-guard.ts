import { requireRole, type RoleContext } from "@/lib/role-guard";

// Guard for the practitioner portal: the caller must hold the `provider` role.
// Admins are deliberately NOT allowed through — they have their own console, and
// provider-scoped reads assume `provider_id = auth.uid()`.
export async function assertProvider(context: RoleContext): Promise<string> {
  await requireRole(context, "provider");
  return context.userId;
}
