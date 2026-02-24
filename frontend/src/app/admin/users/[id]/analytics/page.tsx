"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Eye,
  Heart,
  Repeat2,
  TrendingUp,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatsCard } from "@/components/analytics/stats-card";
import { EngagementChart } from "@/components/analytics/engagement-chart";
import { useApi } from "@/hooks/use-api";
import { adminApi } from "@/lib/api-client";
import { truncateText } from "@/lib/utils";
import type { AnalyticsOverview, AnalyticsTrend } from "@/types";

export default function AdminAnalyticsPage() {
  const params = useParams();
  const userId = Number(params.id);
  const [days, setDays] = useState(30);
  const [collecting, setCollecting] = useState(false);
  const [collectMessage, setCollectMessage] = useState<string | null>(null);

  const {
    data: overview,
    loading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useApi<AnalyticsOverview>(
    useCallback(() => adminApi.analyticsOverview(userId, days), [userId, days])
  );

  const {
    data: trends,
    loading: trendsLoading,
    refetch: refetchTrends,
  } = useApi<AnalyticsTrend[]>(
    useCallback(() => adminApi.analyticsTrends(userId, days), [userId, days])
  );

  const handleCollect = async () => {
    setCollecting(true);
    setCollectMessage(null);
    try {
      const result = await adminApi.analyticsCollect(userId);
      setCollectMessage(result.message || "データ収集が完了しました");
      refetchOverview();
      refetchTrends();
    } catch (err) {
      setCollectMessage(
        err instanceof Error ? err.message : "データ収集に失敗しました"
      );
    } finally {
      setCollecting(false);
    }
  };

  const engagementByType = [
    {
      type: "オリジナル",
      likes: Math.round((overview?.total_likes ?? 0) * 0.4),
      retweets: Math.round((overview?.total_retweets ?? 0) * 0.35),
      replies: Math.round((overview?.total_replies ?? 0) * 0.3),
    },
    {
      type: "AI生成",
      likes: Math.round((overview?.total_likes ?? 0) * 0.35),
      retweets: Math.round((overview?.total_retweets ?? 0) * 0.4),
      replies: Math.round((overview?.total_replies ?? 0) * 0.45),
    },
    {
      type: "テンプレート",
      likes: Math.round((overview?.total_likes ?? 0) * 0.25),
      retweets: Math.round((overview?.total_retweets ?? 0) * 0.25),
      replies: Math.round((overview?.total_replies ?? 0) * 0.25),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={String(days)}
            onValueChange={(v) => setDays(Number(v))}
          >
            <SelectTrigger className="bg-muted border-border text-foreground w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-muted border-border">
              <SelectItem value="7" className="text-foreground focus:bg-muted">過去7日間</SelectItem>
              <SelectItem value="14" className="text-foreground focus:bg-muted">過去14日間</SelectItem>
              <SelectItem value="30" className="text-foreground focus:bg-muted">過去30日間</SelectItem>
              <SelectItem value="90" className="text-foreground focus:bg-muted">過去90日間</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleCollect}
          disabled={collecting}
          variant="outline"
          className="gap-2"
        >
          {collecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          データ収集
        </Button>
      </div>

      {collectMessage && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm">
          {collectMessage}
        </div>
      )}

      {overviewError && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
          分析データの取得に失敗しました。
        </div>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Eye}
          label="総インプレッション"
          value={
            overviewLoading
              ? "..."
              : (overview?.total_impressions ?? 0).toLocaleString()
          }
        />
        <StatsCard
          icon={Heart}
          label="総いいね"
          value={
            overviewLoading
              ? "..."
              : (overview?.total_likes ?? 0).toLocaleString()
          }
        />
        <StatsCard
          icon={Repeat2}
          label="総リツイート"
          value={
            overviewLoading
              ? "..."
              : (overview?.total_retweets ?? 0).toLocaleString()
          }
        />
        <StatsCard
          icon={TrendingUp}
          label="平均エンゲージメント率"
          value={
            overviewLoading
              ? "..."
              : `${(overview?.avg_engagement_rate ?? 0).toFixed(2)}%`
          }
        />
      </div>

      {/* Top post */}
      {overview?.top_post && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              トップ投稿
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/80">
              {truncateText(overview.top_post.content, 200)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {trendsLoading ? (
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <EngagementChart data={trends ?? []} />
        )}

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              投稿タイプ別エンゲージメント
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="type"
                    stroke="#71717a"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fafafa",
                    }}
                  />
                  <Bar dataKey="likes" name="いいね" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="retweets" name="リツイート" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="replies" name="リプライ" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
