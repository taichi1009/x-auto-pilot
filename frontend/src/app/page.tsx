"use client";

import { useCallback } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/analytics/stats-card";
import { useApi } from "@/hooks/use-api";
import { dashboardApi } from "@/lib/api-client";
import {
  formatDate,
  truncateText,
  getStatusColor,
  getStatusLabel,
  getPostTypeLabel,
  getPostFormatLabel,
  getPostFormatColor,
} from "@/lib/utils";
import type { DashboardData } from "@/types";

export default function DashboardPage() {
  const {
    data: dashboard,
    loading,
    error,
  } = useApi<DashboardData>(useCallback(() => dashboardApi.get(), []));

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

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/posts/new">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100">AI投稿を生成</h3>
                <p className="text-sm text-zinc-400">
                  AIを使って新しい投稿を作成
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/schedule">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100">スケジュール</h3>
                <p className="text-sm text-zinc-400">
                  投稿の予約を設定
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/persona">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10">
                <User className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100">ペルソナ</h3>
                <p className="text-sm text-zinc-400">
                  投稿キャラクターを設定
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/strategy">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10">
                <Target className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100">戦略</h3>
                <p className="text-sm text-zinc-400">
                  コンテンツ戦略を管理
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-zinc-100">最近の投稿</CardTitle>
          <Link href="/posts">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
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
                  className="h-16 rounded-lg bg-zinc-800 animate-pulse"
                />
              ))}
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="text-center py-12">
              <Send className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">
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
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm text-zinc-100 truncate">
                      {truncateText(post.content, 80)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-500">
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
                    className="border-zinc-700 text-zinc-400 text-[10px] shrink-0"
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
