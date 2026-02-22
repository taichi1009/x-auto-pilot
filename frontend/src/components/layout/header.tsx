"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTierLabel, getTierColor } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/": "ダッシュボード",
  "/posts": "投稿管理",
  "/posts/new": "新規投稿",
  "/templates": "テンプレート",
  "/schedule": "スケジュール",
  "/following": "フォロー管理",
  "/analytics": "分析",
  "/settings": "設定",
};

interface HeaderProps {
  tier?: string;
}

export function Header({ tier = "free" }: HeaderProps) {
  const pathname = usePathname();

  const getTitle = () => {
    if (pageTitles[pathname]) return pageTitles[pathname];
    // Handle dynamic routes
    for (const [path, title] of Object.entries(pageTitles)) {
      if (pathname.startsWith(path) && path !== "/") return title;
    }
    return "X Auto-Pilot";
  };

  return (
    <header className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
      <div className="flex items-center justify-between px-6 py-4 lg:px-8">
        <div className="flex items-center gap-4 pl-12 lg:pl-0">
          <h1 className="text-xl font-bold text-zinc-100">{getTitle()}</h1>
          <Badge
            variant="outline"
            className={getTierColor(tier)}
          >
            {getTierLabel(tier)}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/posts/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">新規投稿</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
