import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth" });
    }
    const { data: role } = await supabase.rpc("get_user_portal", {
      _user_id: data.user.id,
    });
    if (role === "admin") throw redirect({ to: "/admin" });
    if (role === "provider") throw redirect({ to: "/dashboard" });
    await supabase.auth.signOut();
    throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Body Inc Practitioner Portal" },
      { name: "description", content: "Practitioner portal for Body Inc." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => null,
});
