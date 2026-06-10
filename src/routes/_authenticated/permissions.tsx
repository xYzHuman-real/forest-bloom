import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Bell, BatteryCharging, ChevronRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UsageStats, isNativeAndroid } from "@/native/usageStats";
import {
  ensureNotificationPermission,
  scheduleDailyTreeNotifications,
} from "@/native/notifications";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/permissions")({
  ssr: false,
  component: PermissionsFlow,
});

const PROJECT_URL =
  "https://id-preview--ef36cee4-0339-40dc-9cae-c353b4d4c887.lovable.app";

type Step = {
  icon: typeof Activity;
  tint: string;
  title: string;
  body: string;
  cta: string;
  skip: string;
};

const STEPS: Step[] = [
  {
    icon: Activity,
    tint: "oklch(0.95 0.06 150)",
    title: "Let TreeRise see your app time",
    body:
      "Android calls this “Usage Access.” We only read the minutes you spend in each app — never what you type, watch, or share. That's how your tree knows whether to grow or wilt.",
    cta: "Open Usage Access",
    skip: "Not now",
  },
  {
    icon: Bell,
    tint: "oklch(0.94 0.05 200)",
    title: "Gentle nudges, never guilt",
    body:
      "We'll send a few supportive reminders a day — like “Your forest is doing well today 🌳” or a heads-up before you cross a limit. You can mute them anytime in Profile.",
    cta: "Allow notifications",
    skip: "Skip",
  },
  {
    icon: BatteryCharging,
    tint: "oklch(0.96 0.05 90)",
    title: "Keep your tree growing in the background",
    body:
      "Android can pause background apps to save battery. Letting TreeRise keep running means your tree updates hourly even when you forget to open the app.",
    cta: "Allow background sync",
    skip: "Maybe later",
  },
];

function PermissionsFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [working, setWorking] = useState(false);
  const current = STEPS[step];
  const Icon = current.icon;

  const finish = () => navigate({ to: "/home" });

  const advance = async (granted: boolean) => {
    if (step === STEPS.length - 1) {
      // After final step, schedule supportive daily notifications and arm hourly sync.
      try {
        await scheduleDailyTreeNotifications();
        if (isNativeAndroid()) {
          const { data } = await supabase.auth.getSession();
          const bearer = data.session?.access_token;
          if (bearer) {
            await UsageStats.scheduleHourlySync({
              endpoint: `${PROJECT_URL}/api/public/hooks/native-usage`,
              bearer,
            });
          }
        }
      } catch (e) {
        console.warn(e);
      }
      if (!granted && step === 0) {
        navigate({ to: "/limited" });
      } else {
        finish();
      }
      return;
    }
    setStep((s) => s + 1);
  };

  const handleCta = async () => {
    setWorking(true);
    try {
      if (step === 0) {
        if (isNativeAndroid()) {
          await UsageStats.requestUsageAccess();
          // user returns from settings; we re-check on next interaction
          const status = await UsageStats.hasUsageAccess();
          await advance(status.granted);
        } else {
          toast.message("Usage Access is only available in the Android app.");
          await advance(false);
        }
      } else if (step === 1) {
        const ok = await ensureNotificationPermission();
        if (ok) toast.success("Notifications on");
        await advance(ok);
      } else if (step === 2) {
        if (isNativeAndroid()) {
          await UsageStats.requestIgnoreBatteryOptimizations();
        }
        await advance(true);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not complete that step");
      await advance(false);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col safe-top safe-bottom px-6 pt-14 pb-8">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
        <ShieldCheck className="size-4 text-primary" />
        Private by design — only app names &amp; minutes
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="flex-1 flex flex-col"
        >
          <div
            className="size-24 rounded-3xl grid place-items-center mb-8"
            style={{ background: current.tint }}
          >
            <Icon className="size-12 text-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-4xl leading-tight">{current.title}</h1>
          <p className="mt-4 text-base text-muted-foreground">{current.body}</p>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-center gap-1.5 my-6">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-8 bg-primary" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>

      <Button
        onClick={handleCta}
        disabled={working}
        className="w-full h-12 rounded-xl text-base font-semibold"
      >
        {working ? "Working…" : current.cta}
        <ChevronRight className="size-4" />
      </Button>
      <button
        onClick={() => advance(false)}
        className="mt-3 text-sm text-muted-foreground py-2"
      >
        {current.skip}
      </button>
    </div>
  );
}
