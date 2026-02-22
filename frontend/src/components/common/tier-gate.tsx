"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TierGateProps {
  requiredTier: "basic" | "pro";
  currentTier: string;
  children: React.ReactNode;
}

const tierLevel: Record<string, number> = {
  free: 0,
  basic: 1,
  pro: 2,
};

const tierNames: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
};

export function TierGate({ requiredTier, currentTier, children }: TierGateProps) {
  const currentLevel = tierLevel[currentTier] ?? 0;
  const requiredLevel = tierLevel[requiredTier] ?? 0;

  if (currentLevel >= requiredLevel) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-20 blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-zinc-900/95 border border-zinc-700 rounded-xl p-8 text-center max-w-md mx-4 shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
              <Lock className="h-8 w-8 text-zinc-400" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-zinc-100 mb-2">
            {tierNames[requiredTier]}プラン以上が必要です
          </h3>
          <p className="text-sm text-zinc-400 mb-6">
            この機能を利用するには、APIティアを{tierNames[requiredTier]}以上にアップグレードしてください。
          </p>
          <Link href="/settings">
            <Button variant="default" className="gap-2">
              設定でティアを変更
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
