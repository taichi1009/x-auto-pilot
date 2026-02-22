"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  CalendarCheck,
  Activity,
  TrendingUp,
  Sparkles,
  Calendar,
  Send,
  User,
  Target,
  Zap,
  Image as ImageIcon,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { StatsCard } from "@/components/analytics/stats-card";
import { useApi } from "@/hooks/use-api";
import { dashboardApi, autoPilotApi } from "@/lib/api-client";
import {
  formatDate,
  truncateText,
  getStatusColor,
  getStatusLabel,
  getPostTypeLabel,
  getPostFormatLabel,
  getPostFormatColor,
} from "@/lib/utils";
import type { DashboardData, AutoPilotStatus } from "@/types";

export default function DashboardPage() {
  const {
    data: dashboard,
    loading,
    error,
  } = useApi<DashboardData>(useCallback(() => dashboardApi.get(), []));

  const {
    data: autoPilotStatus,
    loading: apLoading,
  } = useApi<AutoPilotStatus>(useCallback(() => autoPilotApi.status(), []));

  const [apEnabled, setApEnabled] = useState(false);
  const [apToggling, setApToggling] = useState(false);

  useEffect(() => {
    if (autoPilotStatus) setApEnabled(autoPilotStatus.enabled);
  }, [autoPilotStatus]);

  const handleToggleAP = async () => {
    setApToggling(true);
    try {
      const result = await autoPilotApi.toggle();
      setApEnabled(result.enabled);
    } catch {
      // ignore
    } finally {
      setApToggling(false);
    }
  };

  const totalPosts = dashboard?.total_posts ?? 0;
  const postsToday = dashboard?.posts_today ?? 0;
  const apiUsageCount = dashboard?.api_usage_count ?? 0;
  const apiUsageLimit = dashboard?.api_usage_limit ?? 100;
  const recentPosts = dashboard?.recent_posts ?? [];

  const postedCount = recentPosts.filter((p) => p.status === "posted").length;
  const totalRecentAttempts = recentPosts.filter(
    (p) => p.status === "posted" || p.status === "failed"
  ).length;
  const successRate =
    totalRecentAttempts > 0
      ? Math.round((postedCount / totalRecentAttempts) * 100)
      : 100;

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
          APIに接続できません。バックエンドサーバーが起動しているか確認してください。
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={MessageSquare}
          label="総投稿数"
          value={loading ? "..." : totalPosts}
        />
        <StatsCard
          icon={CalendarCheck}
          label="今日の投稿"
          value={loading ? "..." : postsToday}
        />
        <StatsCard
          icon={Activity}
          label="API使用量"
          value={loading ? "..." : `${apiUsageCount}/${apiUsageLimit}`}
        />
        <StatsCard
          icon={TrendingUp}
          label="成功率"
          value={loading ? "..." : `${successRate}%`}
        />
      </div>

      {/* Auto-Pilot Status */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-foreground flex items-center gap-2">
            <span className="relative flex h-5 w-5">
              {apEnabled && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              )}
              <Zap className={`relative h-5 w-5 ${apEnabled ? "text-green-400 fill-green-400" : "text-muted-foreground"}`} />
            </span>
            Auto-Pilot
          </CardTitle>
          <Switch
            checked={apEnabled}
            onCheckedChange={handleToggleAP}
            disabled={apToggling || apLoading}
          />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Badge
              variant="outline"
              className={apEnabled
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "border-border text-muted-foreground"
              }
            >
              {apEnabled ? "稼働中" : "停止中"}
            </Badge>
          </div>
          {autoPilotStatus && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <div>
                  <p className="text-muted-foreground text-xs">自動投稿</p>
                  <p className="text-foreground font-medium">
                    {autoPilotStatus.auto_post_enabled ? `${autoPilotStatus.auto_post_count}件/日` : "OFF"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <ImageIcon className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-muted-foreground text-xs">画像生成</p>
                  <p className="text-foreground font-medium">
                    {autoPilotStatus.auto_post_with_image ? "ON" : "OFF"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Users className="h-4 w-4 text-green-400" />
                <div>
                  <p className="text-muted-foreground text-xs">自動フォロー</p>
                  <p className="text-foreground font-medium">
                    {autoPilotStatus.auto_follow_enabled ? `${autoPilotStatus.auto_follow_daily_limit}件/日` : "OFF"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/posts/new">
          <Card className="bg-card border-border hover:border-blue-500/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI投稿を生成</h3>
                <p className="text-sm text-muted-foreground">
                  AIを使って新しい投稿を作成
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/schedule">
          <Card className="bg-card border-border hover:border-blue-500/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">スケジュール</h3>
                <p className="text-sm text-muted-foreground">
                  投稿の予約を設定
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/persona">
          <Card className="bg-card border-border hover:border-blue-500/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10">
                <User className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">ペルソナ</h3>
                <p className="text-sm text-muted-foreground">
                  投稿キャラクターを設定
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/strategy">
          <Card className="bg-card border-border hover:border-blue-500/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10">
                <Target className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">戦略</h3>
                <p className="text-sm text-muted-foreground">
                  コンテンツ戦略を管理
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">最近の投稿</CardTitle>
          <Link href="/posts">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              すべて表示
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="text-center py-12">
              <Send className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                まだ投稿がありません
              </p>
              <Link href="/posts/new">
                <Button variant="outline" size="sm" className="mt-4">
                  最初の投稿を作成
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPosts.slice(0, 10).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm text-foreground truncate">
                      {truncateText(post.content, 80)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(post.created_at)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${getStatusColor(post.status)}`}
                      >
                        {getStatusLabel(post.status)}
                      </Badge>
                      {post.post_format && post.post_format !== "tweet" && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${getPostFormatColor(post.post_format)}`}
                        >
                          {getPostFormatLabel(post.post_format)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-border text-muted-foreground text-[10px] shrink-0"
                  >
                    {getPostTypeLabel(post.post_type)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
