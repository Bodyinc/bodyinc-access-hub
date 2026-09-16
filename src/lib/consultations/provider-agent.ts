import { canProvisionQuickbloxAgents } from "./config";
import {
  ensureQuickbloxProviderAgent,
  loginQuickbloxProviderAgent,
  type QuickbloxProviderSession,
} from "./quickblox";

type AdminClient = {
  from: (table: string) => any;
};

export async function provisionBodyIncProviderAgent(
  supabaseAdmin: AdminClient,
  providerId: string,
): Promise<{ qbUserId: number; created: boolean; email: string }> {
  if (!canProvisionQuickbloxAgents()) {
    throw new Error("QuickBlox agent provisioning is not configured.");
  }

  const [{ data: provider, error: providerErr }, { data: profile, error: profileErr }] =
    await Promise.all([
      supabaseAdmin
        .from("providers")
        .select("id, qb_user_id, specialty, credentials, languages, is_active")
        .eq("id", providerId)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("email, full_name, phone")
        .eq("id", providerId)
        .maybeSingle(),
    ]);

  if (providerErr) throw new Error(providerErr.message);
  if (profileErr) throw new Error(profileErr.message);
  if (!provider) throw new Error("Provider not found");
  if (!provider.is_active) throw new Error("This provider is inactive.");

  const email = String(profile?.email ?? "").trim().toLowerCase();
  if (!email) throw new Error("This provider is missing an email address.");

  const languages = (provider.languages ?? []) as string[];
  const agent = await ensureQuickbloxProviderAgent({
    userId: providerId,
    email,
    fullName: profile?.full_name || "Provider",
    profession: provider.specialty || provider.credentials || "Clinician",
    phone: profile?.phone ?? null,
    language: languages[0] ?? "English",
  });

  if (provider.qb_user_id !== agent.userId) {
    const { error } = await supabaseAdmin
      .from("providers")
      .update({ qb_user_id: agent.userId })
      .eq("id", providerId);
    if (error) throw new Error(error.message);
  }

  return { qbUserId: agent.userId, created: agent.created, email };
}

export async function sessionForBodyIncProvider(
  supabaseAdmin: AdminClient,
  providerId: string,
): Promise<QuickbloxProviderSession> {
  const { email } = await provisionBodyIncProviderAgent(supabaseAdmin, providerId);
  return loginQuickbloxProviderAgent({ email, userId: providerId });
}
