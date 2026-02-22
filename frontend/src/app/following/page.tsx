"use client";

import { useState, useCallback } from "react";
import {
  UserPlus,
  Search,
  Loader2,
  Users,
  UserCheck,
  UserX,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/analytics/stats-card";
import { TierGate } from "@/components/common/tier-gate";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@/contexts/auth-context";
import { followsApi } from "@/lib/api-client";
import {
  formatDate,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";
import type { FollowTarget, FollowStats } from "@/types";

export default function FollowingPage() {
  const { user } = useAuth();
  const tier = user?.subscription_tier || "free";
  const [keyword, setKeyword] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [executing, setExecuting] = useState<number | null>(null);

  const {
    data: targets,
    loading: targetsLoading,
    error: targetsError,
    refetch: refetchTargets,
  } = useApi<FollowTarget[]>(useCallback(() => followsApi.list(), []));

  const {
    data: stats,
    loading: statsLoading,
    refetch: refetchStats,
  } = useApi<FollowStats>(useCallback(() => followsApi.stats(), []));

  const handleDiscover = async () => {
    if (!keyword.trim()) return;
    setDiscovering(true);
    try {
      await followsApi.discover(keyword.trim());
      refetchTargets();
    } catch {
      // Error handled
    } finally {
      setDiscovering(false);
    }
  };

  const handleExecute = async (id: number) => {
    setExecuting(id);
    try {
      await followsApi.execute(id);
      refetchTargets();
      refetchStats();
    } catch {
      // Error handled
    } finally {
      setExecuting(null);
    }
  };

  const handleBatchFollow = async () => {
    const pending = (targets ?? []).filter((t) => t.status === "pending");
    for (const target of pending) {
      try {
        await followsApi.execute(target.id);
      } catch {
        // Continue with next
      }
    }
    refetchTargets();
    refetchStats();
  };

  const followBackRate =
    stats && stats.completed > 0
      ? Math.round((stats.follow_backs / stats.completed) * 100)
      : 0;

  const content = (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Users}
          label="総ターゲット数"
          value={statsLoading ? "..." : stats?.total_targets ?? 0}
        />
        <StatsCard
          icon={UserCheck}
          label="フォロー完了"
          value={statsLoading ? "..." : stats?.completed ?? 0}
        />
        <StatsCard
          icon={UserX}
          label="失敗"
          value={statsLoading ? "..." : stats?.failed ?? 0}
        />
        <StatsCard
          icon={RefreshCw}
          label="フォローバック率"
          value={statsLoading ? "..." : `${followBackRate}%`}
        />
      </div>

      {/* Discover section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            ユーザー検索
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="sr-only">キーワード</Label>
              <Input
                placeholder="キーワードで関連ユーザーを検索..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
                className="bg-muted border-border text-foreground"
              />
            </div>
            <Button
              onClick={handleDiscover}
              disabled={discovering || !keyword.trim()}
              className="gap-2"
            >
              {discovering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              検索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batch actions */}
      {(targets ?? []).filter((t) => t.status === "pending").length > 0 && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchFollow}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            待機中をすべてフォロー (
            {(targets ?? []).filter((t) => t.status === "pending").length}件)
          </Button>
        </div>
      )}

      {/* Error */}
      {targetsError && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
          フォロー情報の取得に失敗しました: {targetsError}
        </div>
      )}

      {/* Targets table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">
            フォローターゲット
          </CardTitle>
        </CardHeader>
        <CardContent>
          {targetsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : (targets ?? []).length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                フォローターゲットがありません。キーワードで検索して追加しましょう。
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                      ユーザー名
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                      ステータス
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                      アクション
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                      フォローバック
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                      日時
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(targets ?? []).map((target) => (
                    <tr
                      key={target.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm text-foreground">
                          @{target.x_username}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${getStatusColor(target.status)}`}
                        >
                          {getStatusLabel(target.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {target.action === "follow"
                            ? "フォロー"
                            : "アンフォロー"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            target.follow_back
                              ? "bg-green-500/20 text-green-400 border-green-500/30 text-[10px]"
                              : "border-border text-muted-foreground text-[10px]"
                          }
                        >
                          {target.follow_back ? "あり" : "なし"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-muted-foreground">
                          {target.followed_at
                            ? formatDate(target.followed_at)
                            : "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {target.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExecute(target.id)}
                            disabled={executing === target.id}
                            className="text-blue-400 hover:text-blue-300 gap-1.5"
                          >
                            {executing === target.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="h-3.5 w-3.5" />
                            )}
                            実行
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <TierGate requiredTier="basic" currentTier={tier}>
      {content}
    </TierGate>
  );
}
