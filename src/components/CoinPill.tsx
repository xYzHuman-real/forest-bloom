import { Coins } from "lucide-react";

export function CoinPill({ amount, className = "" }: { amount: number; className?: string }) {
  return (
    <span className={`pill bg-[oklch(0.97_0.08_85)] text-[oklch(0.4_0.12_70)] ${className}`}>
      <Coins className="size-3.5" />
      <span>{amount.toLocaleString()}</span>
    </span>
  );
}
