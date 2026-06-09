import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, Trees, ShieldCheck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeOnboarding } from "@/lib/treerise.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: Onboarding,
});

const slides = [
  {
    icon: Sprout,
    title: "Every morning, plant a tree",
    body: "Your focus decides whether it grows tall or withers. Stay within your screen-time limits and your forest thrives.",
    color: "oklch(0.95 0.06 150)",
  },
  {
    icon: Trees,
    title: "Build a living forest",
    body: "Healthy trees attract birds, butterflies and rivers. Dead trees stay — until you bring them back to life.",
    color: "oklch(0.94 0.05 200)",
  },
  {
    icon: ShieldCheck,
    title: "Track quietly. Stay private.",
    body: "Usage is tracked on this device. No ads, no selling — just you and your forest.",
    color: "oklch(0.96 0.05 90)",
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const complete = useServerFn(completeOnboarding);

  const finish = async () => {
    setSaving(true);
    try {
      await complete({ data: { display_name: name || undefined } });
      toast.success("Your forest is ready 🌱");
      navigate({ to: "/home" });
    } catch (e: any) {
      toast.error(e.message ?? "Could not finish setup");
    } finally { setSaving(false); }
  };

  const isLast = step === slides.length;

  return (
    <div className="min-h-screen flex flex-col safe-top safe-bottom px-6 pt-14 pb-8">
      <AnimatePresence mode="wait">
        {!isLast ? (
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex-1 flex flex-col">
            <div className="size-24 rounded-3xl grid place-items-center mb-8" style={{ background: slides[step].color }}>
              {(() => { const I = slides[step].icon; return <I className="size-12 text-foreground" strokeWidth={1.5} />; })()}
            </div>
            <h1 className="font-display text-4xl leading-tight">{slides[step].title}</h1>
            <p className="mt-4 text-base text-muted-foreground">{slides[step].body}</p>
          </motion.div>
        ) : (
          <motion.div key="name" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col">
            <div className="size-24 rounded-3xl grid place-items-center mb-8 bg-accent">
              <Sprout className="size-12 text-primary" />
            </div>
            <h1 className="font-display text-4xl leading-tight">What should we call you?</h1>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-6 h-12 rounded-xl" />
            <p className="mt-3 text-xs text-muted-foreground">You can change this later in Profile.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-center gap-1.5 my-6">
        {[...slides, null].map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-1.5 bg-border"}`} />
        ))}
      </div>

      <Button
        onClick={() => (isLast ? finish() : setStep(step + 1))}
        disabled={saving}
        className="w-full h-12 rounded-xl text-base font-semibold"
      >
        {isLast ? (saving ? "Planting..." : "Plant my first tree") : "Continue"}
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
