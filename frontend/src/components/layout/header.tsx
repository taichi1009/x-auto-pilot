"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plus, Zap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTierLabel, getTierColor } from "@/lib/utils";
import { autoPilotApi } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";

const pageTitles: Record<string, string> = {
  "/": "ダッシュボード",
  "/posts": "投稿管理",
  "/posts/new": "新規投稿",
  "/templates": "テンプレート",
  "/schedule": "スケジュール",
  "/following": "フォロー管理",
  "/analytics": "分析",
  "/settings": "設定",
  "/persona": "ペルソナ",
  "/strategy": "戦略",
  "/admin": "管理パネル",
};

interface HeaderProps {
  tier?: string;
}

export function Header({ tier = "free" }: HeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    autoPilotApi.status().then((s) => setAutoPilotEnabled(s.enabled)).catch(() => {});
  }, []);

  const handleToggleAutoPilot = async () => {
    setToggling(true);
    try {
      const result = await autoPilotApi.toggle();
      setAutoPilotEnabled(result.enabled);
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  };

  const getTitle = () => {
    if (pageTitles[pathname]) return pageTitles[pathname];
    for (const [path, title] of Object.entries(pageTitles)) {
      if (pathname.startsWith(path) && path !== "/") return title;
    }
    return "X Auto-Pilot";
  };

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between px-6 py-4 lg:px-8">
        <div className="flex items-center gap-4 pl-12 lg:pl-0">
          <h1 className="text-xl font-bold text-foreground">{getTitle()}</h1>
          <Badge
            variant="outline"
            className={getTierColor(tier)}
          >
            {getTierLabel(tier)}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.name}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${autoPilotEnabled ? "text-green-400 hover:text-green-300" : "text-muted-foreground hover:text-foreground"}`}
            onClick={handleToggleAutoPilot}
            disabled={toggling}
          >
            <span className="relative flex h-4 w-4">
              {autoPilotEnabled && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              )}
              <Zap className={`relative h-4 w-4 ${autoPilotEnabled ? "fill-green-400" : ""}`} />
            </span>
            <span className="hidden sm:inline text-xs font-medium">
              Auto-Pilot {autoPilotEnabled ? "ON" : "OFF"}
            </span>
          </Button>
          <ThemeToggle />
          <Link href="/posts/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">新規投稿</span>
            </Button>
          </Link>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
