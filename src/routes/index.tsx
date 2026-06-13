import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sprout } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  component: SplashScreen,
});

function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const start = Date.now();
    const decide = async () => {
      let target: "/home" | "/auth" | "/welcome" = "/welcome";
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarded")
            .eq("id", data.session.user.id)
            .maybeSingle();
          target = profile?.onboarded ? "/home" : "/onboarding";
        } else {
          const seen =
            typeof window !== "undefined" &&
            window.localStorage.getItem("tr_welcomed") === "1";
          target = seen ? "/auth" : "/welcome";
        }
      } catch {
        target = "/welcome";
      }
      const wait = Math.max(0, 2300 - (Date.now() - start));
      setTimeout(() => navigate({ to: target }), wait);
    };
    decide();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 safe-top safe-bottom">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="size-24 rounded-3xl bg-primary text-primary-foreground grid place-items-center shadow-xl"
      >
        <Sprout className="size-12" strokeWidth={1.5} />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7 }}
        className="mt-8 font-display text-4xl text-foreground tracking-tight"
      >
        TreeRise
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.8 }}
        className="mt-3 text-center text-sm text-muted-foreground max-w-[18rem] leading-relaxed"
      >
        The app where your screen habits grow — or destroy — a virtual forest.
      </motion.p>
    </div>
  );
}
