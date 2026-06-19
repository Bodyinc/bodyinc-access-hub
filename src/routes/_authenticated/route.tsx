import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }

    const { data: role, error: roleError } = await supabase.rpc("get_user_portal", {
      _user_id: data.user.id,
    });
    if (roleError || role !== "provider") {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }

    return { user: data.user, role };
  },
  component: () => <Outlet />,
});