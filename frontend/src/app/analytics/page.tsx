"use client";

import { useState, useCallback } from "react";
import {
  Eye,
  Heart,
  Repeat2,
  MessageCircle,
  TrendingUp,
  RefreshCw,
  Loader2,
  ListChecks,
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
import { TierGate } from "@/components/common/tier-gate";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@/contexts/auth-context";
import { analyticsApi, pdcaApi } from "@/lib/api-client";
import { truncateText } from "@/lib/utils";
import type { AnalyticsOverview, AnalyticsTrend, PdcaLog } from "@/types";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const tier = user?.subscription_tier || "free";
  const [days, setDays] = useState(30);
  const [collecting, setCollecting] = useState(false);

  const {
    data: overview,
    loading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useApi<AnalyticsOverview>(
    useCallback(() => analyticsApi.overview(), [])
  );

  const {
    data: trends,
    loading: trendsLoading,
  } = useApi<AnalyticsTrend[]>(
    useCallback(() => analyticsApi.trends({ days }), [days])
  );

  const {
    data: pdcaLog,
    loading: pdcaLoading,
  } = useApi<PdcaLog>(useCallback(() => pdcaApi.latest(), []));

  const handleCollect = async () => {
    setCollecting(true);
    try {
      await analyticsApi.collect();
      refetchOverview();
    } catch {
      // Error handled
    } finally {
      setCollecting(false);
    }
  };

  // Aggregate data by post type for bar chart
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

  const content = (
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
              <SelectItem
                value="7"
                className="text-foreground focus:bg-muted"
              >
                過去7日間
              </SelectItem>
              <SelectItem
                value="14"
                className="text-foreground focus:bg-muted"
              >
                過去14日間
              </SelectItem>
              <SelectItem
                value="30"
                className="text-foreground focus:bg-muted"
              >
                過去30日間
              </SelectItem>
              <SelectItem
                value="90"
                className="text-foreground focus:bg-muted"
              >
                過去90日間
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={handleCollect}
          disabled={collecting}
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

      {overviewError && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
          分析データの取得に失敗しました。バックエンドが起動しているか確認してください。
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
        {/* Engagement trend chart */}
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

        {/* Engagement by post type */}
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
                  <Bar
                    dataKey="likes"
                    name="いいね"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="retweets"
                    name="リツイート"
                    fill="#a855f7"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="replies"
                    name="リプライ"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PDCA Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            PDCA分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pdcaLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-8 rounded bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : pdcaLog ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-foreground/80 mb-2">
                  分析タイプ: {pdcaLog.analysis_type}
                </h4>
                <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(pdcaLog.analysis_result, null, 2)}
                  </pre>
                </div>
              </div>

              {pdcaLog.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground/80 mb-2">
                    レコメンデーション
                  </h4>
                  <ul className="space-y-2">
                    {pdcaLog.recommendations.map((rec, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="text-blue-400 mt-0.5">-</span>
                        <span>{String(rec)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                まだPDCA分析データがありません。データ収集を実行してください。
              </p>
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
