import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      throw redirect({ to: "/dashboard" });
    }
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
