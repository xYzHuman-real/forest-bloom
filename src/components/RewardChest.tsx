import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Gift, Sparkles } from "lucide-react";

export function RewardChest({
  day, onClaim, claiming,
}: {
  day: string;
  onClaim: () => Promise<{ reward?: any } | void>;
  claiming: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const [reward, setReward] = useState<any>(null);

  const handle = async () => {
    if (opened || claiming) return;
    const res = (await onClaim()) as any;
    setReward(res?.reward ?? { coins: 50 });
    setOpened(true);
  };

  return (
    <motion.button
      onClick={handle}
      whileTap={{ scale: 0.96 }}
      className="w-full soft-card p-4 flex items-center gap-4 bg-gradient-to-br from-amber-50 to-emerald-50 border-amber-200 text-left"
    >
      <motion.div
        animate={opened ? { rotate: [0, -10, 10, 0], scale: 1.1 } : { y: [0, -4, 0] }}
        transition={opened ? { duration: 0.6 } : { repeat: Infinity, duration: 1.6 }}
        className="size-14 rounded-2xl grid place-items-center bg-amber-100 text-2xl"
      >
        {opened ? "✨" : "🎁"}
      </motion.div>
      <div className="flex-1">
        <div className="font-display text-base flex items-center gap-1.5">
          {opened ? "Reward claimed" : "Daily reward chest"}
          {!opened && <Sparkles className="size-3.5 text-amber-500" />}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {opened
            ? <AnimatePresence><motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>+{reward?.coins ?? 0} coins added</motion.span></AnimatePresence>
            : <>Yesterday was healthy — tap to open</>}
        </div>
      </div>
      <Gift className="size-5 text-amber-600" />
    </motion.button>
  );
}
