"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type { User } from "@/types";

const tabs = [
  { label: "基本設定", href: "" },
  { label: "ペルソナ", href: "/persona" },
  { label: "戦略", href: "/strategy" },
  { label: "テンプレート", href: "/templates" },
  { label: "投稿", href: "/posts" },
  { label: "フォロー", href: "/following" },
  { label: "分析", href: "/analytics" },
  { label: "スケジュール", href: "/schedule" },
];

export default function AdminUserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { user: currentUser } = useAuth();
  const userId = Number(params.id);

  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      router.push("/");
      return;
    }

    adminApi
      .getUser(userId)
      .then((u) => setTargetUser(u))
      .catch(() => router.push("/admin"))
      .finally(() => setLoading(false));
  }, [userId, currentUser, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!targetUser) return null;

  const basePath = `/admin/users/${userId}`;

  const getActiveTab = () => {
    const subPath = pathname.replace(basePath, "");
    if (!subPath || subPath === "/") return "";
    return subPath;
  };

  const activeTab = getActiveTab();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link href="/admin">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          ユーザー一覧に戻る
        </Button>
      </Link>

      {/* User info header */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {targetUser.name}
          </h1>
          <p className="text-sm text-muted-foreground">{targetUser.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border text-muted-foreground">
            {targetUser.subscription_tier}
          </Badge>
          <Badge
            className={
              targetUser.is_active
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : "bg-red-500/20 text-red-400 border-red-500/30"
            }
          >
            {targetUser.is_active ? "有効" : "無効"}
          </Badge>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.href;
            return (
              <Link
                key={tab.href}
                href={`${basePath}${tab.href}`}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
