"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, BarChart3, CreditCard, FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { getTierLabel, getTierColor, formatDate } from "@/lib/utils";
import type { User, AdminStats } from "@/types";

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/");
      return;
    }

    Promise.all([adminApi.stats(), adminApi.users()])
      .then(([s, u]) => {
        setStats(s);
        setUsers(u);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">総ユーザー数</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total_users}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Users className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">アクティブユーザー</p>
                  <p className="text-2xl font-bold text-foreground">{stats.active_users}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <CreditCard className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">月次収益</p>
                  <p className="text-2xl font-bold text-foreground">${stats.monthly_revenue.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <FileText className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">総投稿数</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total_posts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tier Breakdown */}
      {stats && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              ティア内訳
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(stats.tier_breakdown).map(([tier, count]) => (
                <div key={tier} className="flex items-center gap-2">
                  <Badge variant="outline" className={getTierColor(tier)}>
                    {getTierLabel(tier)}
                  </Badge>
                  <span className="text-foreground font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            ユーザー一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">名前</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">メール</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">ロール</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">ティア</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">ステータス</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">登録日</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-4 text-foreground">{u.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className={u.role === "admin" ? "border-red-500/30 text-red-400" : "border-border text-muted-foreground"}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className={getTierColor(u.subscription_tier)}>
                        {getTierLabel(u.subscription_tier)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className={u.is_active ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"}>
                        {u.is_active ? "有効" : "無効"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center text-muted-foreground text-xs">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link href={`/admin/users/${u.id}`}>
                        <Button variant="outline" size="sm">
                          編集
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
