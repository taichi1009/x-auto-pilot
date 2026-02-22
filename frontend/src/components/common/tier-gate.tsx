"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TierGateProps {
  requiredTier: "basic" | "pro" | "enterprise";
  currentTier: string;
  children: React.ReactNode;
}

const tierLevel: Record<string, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  enterprise: 3,
};

const tierNames: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
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
        <div className="bg-card/95 border border-border rounded-xl p-8 text-center max-w-md mx-4 shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            {tierNames[requiredTier]}プラン以上が必要です
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            この機能を利用するには、{tierNames[requiredTier]}以上にアップグレードしてください。
          </p>
          <Link href="/settings">
            <Button variant="default" className="gap-2">
              設定でプランを変更
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
