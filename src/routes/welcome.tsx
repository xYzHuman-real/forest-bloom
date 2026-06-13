import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, Smartphone, Trees, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/welcome")({
  ssr: false,
  component: Welcome,
});

const slides = [
  {
    icon: Sprout,
    emoji: "🌱",
    title: "Grow a Forest",
    body: "Reduce your screen time and build a beautiful virtual ecosystem that's truly yours.",
    tint: "oklch(0.95 0.06 150)",
  },
  {
    icon: Smartphone,
    emoji: "📱",
    title: "Your Habits Matter",
    body: "Every day a new tree is planted. Stay within your limits to help it survive and thrive.",
    tint: "oklch(0.94 0.05 200)",
  },
  {
    icon: Trees,
    emoji: "🌳",
    title: "Real Progress",
    body: "Grow forests, earn rewards, unlock rare trees, and build healthier digital habits.",
    tint: "oklch(0.96 0.05 90)",
  },
];

function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const isLast = step === slides.length - 1;
  const slide = slides[step];
  const Icon = slide.icon;

  const finish = () => {
    try {
      window.localStorage.setItem("tr_welcomed", "1");
    } catch {}
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen flex flex-col safe-top safe-bottom px-6 pt-14 pb-8 bg-background">
      <div className="flex justify-end">
        <button
          onClick={finish}
          className="text-sm text-muted-foreground py-2 px-2"
        >
          Skip
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.35 }}
          className="flex-1 flex flex-col"
        >
          <div
            className="size-28 rounded-3xl grid place-items-center mb-8 mt-4 relative"
            style={{ background: slide.tint }}
          >
            <Icon className="size-14 text-foreground" strokeWidth={1.5} />
            <span className="absolute -top-2 -right-2 text-3xl">{slide.emoji}</span>
          </div>
          <h1 className="font-display text-4xl leading-tight">{slide.title}</h1>
          <p className="mt-4 text-base text-muted-foreground">{slide.body}</p>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-center gap-1.5 my-6">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-8 bg-primary" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>

      <Button
        onClick={() => (isLast ? finish() : setStep(step + 1))}
        className="w-full h-12 rounded-xl text-base font-semibold"
      >
        {isLast ? "Get Started" : "Next"}
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
