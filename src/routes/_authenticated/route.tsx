import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", data.user.id).maybeSingle();
    if (!profile?.onboarded) throw redirect({ to: "/onboarding" });
    return { user: data.user };
  },
  component: () => (
    <>
      <Outlet />
      <BottomNav />
    </>
  ),
});
