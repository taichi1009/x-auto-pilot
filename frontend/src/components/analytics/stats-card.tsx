"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  trend,
  className,
}: StatsCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="h-3 w-3 text-green-400" />;
    if (trend.value < 0) return <TrendingDown className="h-3 w-3 text-red-400" />;
    return <Minus className="h-3 w-3 text-zinc-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value > 0) return "text-green-400";
    if (trend.value < 0) return "text-red-400";
    return "text-zinc-400";
  };

  return (
    <Card className={cn("bg-zinc-900 border-zinc-800", className)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-800">
            <Icon className="h-5 w-5 text-zinc-400" />
          </div>
          <span className="text-sm text-zinc-400">{label}</span>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-zinc-100">{value}</span>
          {trend && (
            <div className={cn("flex items-center gap-1 text-xs", getTrendColor())}>
              {getTrendIcon()}
              <span>
                {trend.value > 0 ? "+" : ""}
                {trend.value}% {trend.label}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
