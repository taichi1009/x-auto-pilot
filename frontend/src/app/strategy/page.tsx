"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Target,
  TrendingUp,
  Zap,
  Clock,
  Hash,
  Sparkles,
  LayoutGrid,
  CheckCircle2,
  Users,
  Eye,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { strategyApi } from "@/lib/api-client";
import type { ContentStrategy, ContentStrategyCreate } from "@/types";

// Default empty form data for creating a new strategy
const emptyFormData: ContentStrategyCreate = {
  name: "",
  content_pillars: [],
  hashtag_groups: {},
  posting_frequency: 3,
  optimal_posting_times: [],
  impression_target: 10000,
  follower_growth_target: 100,
  engagement_rate_target: 2.0,
  content_mix: { tweet: 60, thread: 30, long_form: 10 },
  avoid_topics: [],
  competitor_accounts: [],
};

export default function StrategyPage() {
  // ── Data fetching ──
  const {
    data: strategies,
    loading,
    error,
    refetch,
  } = useApi<ContentStrategy[]>(useCallback(() => strategyApi.list(), []));

  // ── Dialog state ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] =
    useState<ContentStrategy | null>(null);
  const [formData, setFormData] =
    useState<ContentStrategyCreate>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [activating, setActivating] = useState<number | null>(null);

  // ── Form helper inputs (comma-separated) ──
  const [pillarsInput, setPillarsInput] = useState("");
  const [timesInput, setTimesInput] = useState("");
  const [avoidInput, setAvoidInput] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");

  // ── Hashtag group editing ──
  const [hashtagGroupName, setHashtagGroupName] = useState("");
  const [hashtagGroupTags, setHashtagGroupTags] = useState("");

  // ── AI Recommendations ──
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // ── Derived data ──
  const activeStrategy = (strategies ?? []).find((s) => s.is_active) ?? null;

  // ── Dialog open helpers ──
  const openCreateDialog = () => {
    setEditingStrategy(null);
    setFormData({ ...emptyFormData, content_mix: { tweet: 60, thread: 30, long_form: 10 } });
    setPillarsInput("");
    setTimesInput("");
    setAvoidInput("");
    setCompetitorInput("");
    setDialogOpen(true);
  };

  const openEditDialog = (strategy: ContentStrategy) => {
    setEditingStrategy(strategy);
    setFormData({
      name: strategy.name,
      content_pillars: strategy.content_pillars,
      hashtag_groups: strategy.hashtag_groups,
      posting_frequency: strategy.posting_frequency,
      optimal_posting_times: strategy.optimal_posting_times,
      impression_target: strategy.impression_target,
      follower_growth_target: strategy.follower_growth_target,
      engagement_rate_target: strategy.engagement_rate_target,
      content_mix: { ...strategy.content_mix },
      avoid_topics: strategy.avoid_topics,
      competitor_accounts: strategy.competitor_accounts,
    });
    setPillarsInput(strategy.content_pillars.join(", "));
    setTimesInput(strategy.optimal_posting_times.join(", "));
    setAvoidInput(strategy.avoid_topics.join(", "));
    setCompetitorInput(strategy.competitor_accounts.join(", "));
    setDialogOpen(true);
  };

  // ── CRUD operations ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const pillars = pillarsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const times = timesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const avoid = avoidInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const competitors = competitorInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const data: ContentStrategyCreate = {
        ...formData,
        content_pillars: pillars,
        optimal_posting_times: times,
        avoid_topics: avoid,
        competitor_accounts: competitors,
      };

      if (editingStrategy) {
        await strategyApi.update(editingStrategy.id, data);
      } else {
        await strategyApi.create(data);
      }
      setDialogOpen(false);
      refetch();
    } catch {
      // Error handled by API client
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await strategyApi.delete(id);
      refetch();
    } catch {
      // Error handled by API client
    } finally {
      setDeleting(null);
    }
  };

  const handleActivate = async (id: number) => {
    setActivating(id);
    try {
      await strategyApi.activate(id);
      refetch();
    } catch {
      // Error handled
    } finally {
      setActivating(null);
    }
  };

  const handleFetchRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const result = await strategyApi.recommendations();
      setRecommendations(result.recommendations ?? []);
    } catch {
      setRecommendations([]);
    } finally {
      setLoadingRecs(false);
    }
  };

  // ── Hashtag group management (within the active strategy view) ──
  const handleAddHashtagGroup = () => {
    if (!hashtagGroupName.trim() || !hashtagGroupTags.trim()) return;
    const tags = hashtagGroupTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      hashtag_groups: {
        ...prev.hashtag_groups,
        [hashtagGroupName.trim()]: tags,
      },
    }));
    setHashtagGroupName("");
    setHashtagGroupTags("");
  };

  const handleRemoveHashtagGroup = (groupName: string) => {
    setFormData((prev) => {
      const updated = { ...prev.hashtag_groups };
      delete updated[groupName];
      return { ...prev, hashtag_groups: updated };
    });
  };

  // ── Content mix update helper ──
  const updateContentMix = (key: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      content_mix: {
        ...prev.content_mix,
        [key]: value,
      },
    }));
  };

  const contentMixTotal =
    (formData.content_mix?.tweet ?? 0) +
    (formData.content_mix?.thread ?? 0) +
    (formData.content_mix?.long_form ?? 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            コンテンツ戦略
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            X運用の戦略を設定し、コンテンツの方向性を管理します
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          新規戦略
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
          戦略データの取得に失敗しました: {error}
        </div>
      )}

      {/* ── Strategy Summary Card (top) ── */}
      {loading ? (
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="h-24 rounded bg-muted animate-pulse" />
          </CardContent>
        </Card>
      ) : activeStrategy ? (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-400" />
              アクティブ戦略: {activeStrategy.name}
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-2">
                有効
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  投稿頻度
                </div>
                <p className="text-xl font-bold text-foreground">
                  {activeStrategy.posting_frequency}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    回/日
                  </span>
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Eye className="h-3.5 w-3.5" />
                  インプレッション目標
                </div>
                <p className="text-xl font-bold text-foreground">
                  {activeStrategy.impression_target.toLocaleString()}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Users className="h-3.5 w-3.5" />
                  フォロワー増加目標
                </div>
                <p className="text-xl font-bold text-foreground">
                  +{activeStrategy.follower_growth_target.toLocaleString()}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  エンゲージメント率目標
                </div>
                <p className="text-xl font-bold text-foreground">
                  {activeStrategy.engagement_rate_target}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Target className="h-10 w-10 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground/80 mb-2">
              まだ戦略が作成されていません
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              最初のコンテンツ戦略を作成して、X運用を最適化しましょう
            </p>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              最初の戦略を作成
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Active strategy details ── */}
      {activeStrategy && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Growth Goals Section */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                成長目標
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-foreground/80">
                    フォロワー増加目標
                  </span>
                </div>
                <span className="text-lg font-bold text-foreground">
                  +{activeStrategy.follower_growth_target.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-foreground/80">
                    インプレッション目標
                  </span>
                </div>
                <span className="text-lg font-bold text-foreground">
                  {activeStrategy.impression_target.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-foreground/80">
                    エンゲージメント率目標
                  </span>
                </div>
                <span className="text-lg font-bold text-foreground">
                  {activeStrategy.engagement_rate_target}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Content Pillars Section */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-base flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-purple-400" />
                コンテンツの柱
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeStrategy.content_pillars.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeStrategy.content_pillars.map((pillar) => (
                    <Badge
                      key={pillar}
                      variant="outline"
                      className="border-purple-500/30 text-purple-400 px-3 py-1"
                    >
                      {pillar}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  コンテンツの柱が設定されていません
                </p>
              )}
            </CardContent>
          </Card>

          {/* Content Mix Section */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                コンテンツミックス
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(activeStrategy.content_mix).map(
                ([key, value]) => {
                  const labels: Record<string, string> = {
                    tweet: "ツイート",
                    thread: "スレッド",
                    long_form: "長文",
                  };
                  const colors: Record<string, string> = {
                    tweet: "bg-blue-500",
                    thread: "bg-green-500",
                    long_form: "bg-purple-500",
                  };
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground/80">
                          {labels[key] ?? key}
                        </span>
                        <span className="text-foreground font-medium">
                          {value}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[key] ?? "bg-muted-foreground"} rounded-full transition-all`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </CardContent>
          </Card>

          {/* Optimal Posting Times */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                最適投稿時間
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeStrategy.optimal_posting_times.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeStrategy.optimal_posting_times.map((time) => (
                    <Badge
                      key={time}
                      variant="outline"
                      className="border-cyan-500/30 text-cyan-400 px-3 py-1"
                    >
                      {time}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  投稿時間が設定されていません
                </p>
              )}
            </CardContent>
          </Card>

          {/* Hashtag Groups */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-base flex items-center gap-2">
                <Hash className="h-4 w-4 text-pink-400" />
                ハッシュタググループ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(activeStrategy.hashtag_groups).length > 0 ? (
                Object.entries(activeStrategy.hashtag_groups).map(
                  ([groupName, tags]) => (
                    <div
                      key={groupName}
                      className="p-3 bg-muted/50 rounded-lg"
                    >
                      <h4 className="text-sm font-medium text-foreground/90 mb-2">
                        {groupName}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="border-pink-500/30 text-pink-400 text-xs"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  ハッシュタググループが設定されていません
                </p>
              )}
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                AIレコメンデーション
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                onClick={handleFetchRecommendations}
                disabled={loadingRecs}
                className="w-full gap-2 border-border text-foreground/80 hover:text-foreground"
              >
                {loadingRecs ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                レコメンデーションを取得
              </Button>
              {recommendations.length > 0 && (
                <ul className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-foreground/80"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Strategy List ── */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          戦略一覧
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (strategies ?? []).length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-10 w-10 text-muted-foreground/60 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              まだ戦略がありません。新規戦略を作成してください。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(strategies ?? []).map((strategy) => (
              <Card
                key={strategy.id}
                className={`bg-card border-border hover:border-border transition-colors ${
                  strategy.is_active ? "ring-1 ring-green-500/30" : ""
                }`}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {strategy.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        作成日:{" "}
                        {new Date(strategy.created_at).toLocaleDateString(
                          "ja-JP"
                        )}
                      </p>
                    </div>
                    {strategy.is_active && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        有効
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">
                      投稿頻度:{" "}
                      <span className="text-foreground/90">
                        {strategy.posting_frequency}回/日
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      目標IMP:{" "}
                      <span className="text-foreground/90">
                        {strategy.impression_target.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {strategy.content_pillars.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {strategy.content_pillars.slice(0, 3).map((pillar) => (
                        <Badge
                          key={pillar}
                          variant="outline"
                          className="border-border text-muted-foreground text-[10px]"
                        >
                          {pillar}
                        </Badge>
                      ))}
                      {strategy.content_pillars.length > 3 && (
                        <Badge
                          variant="outline"
                          className="border-border text-muted-foreground text-[10px]"
                        >
                          +{strategy.content_pillars.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    {!strategy.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleActivate(strategy.id)}
                        disabled={activating === strategy.id}
                        className="text-green-400 hover:text-green-300 gap-1.5"
                      >
                        {activating === strategy.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        有効化
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(strategy)}
                      className="text-muted-foreground hover:text-foreground gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      編集
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(strategy.id)}
                      disabled={deleting === strategy.id}
                      className="text-red-400 hover:text-red-300 gap-1.5"
                    >
                      {deleting === strategy.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      削除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingStrategy ? "戦略を編集" : "新規戦略を作成"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Strategy name */}
            <div className="space-y-2">
              <Label className="text-foreground/80">戦略名</Label>
              <Input
                placeholder="例: メイン成長戦略"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="bg-muted border-border text-foreground"
              />
            </div>

            {/* Growth targets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground/80">投稿頻度 (回/日)</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.posting_frequency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      posting_frequency: Number(e.target.value),
                    })
                  }
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground/80">
                  インプレッション目標
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.impression_target}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      impression_target: Number(e.target.value),
                    })
                  }
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground/80">
                  フォロワー増加目標
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.follower_growth_target}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      follower_growth_target: Number(e.target.value),
                    })
                  }
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </div>

            {/* Engagement rate target */}
            <div className="space-y-2">
              <Label className="text-foreground/80">
                エンゲージメント率目標 (%)
              </Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={formData.engagement_rate_target}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    engagement_rate_target: Number(e.target.value),
                  })
                }
                className="bg-muted border-border text-foreground"
              />
            </div>

            {/* Content pillars */}
            <div className="space-y-2">
              <Label className="text-foreground/80">
                コンテンツの柱 (カンマ区切り)
              </Label>
              <Input
                placeholder="例: テック, ライフハック, キャリア"
                value={pillarsInput}
                onChange={(e) => setPillarsInput(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                カンマで区切って複数の柱を入力してください
              </p>
            </div>

            {/* Content mix */}
            <div className="space-y-3">
              <Label className="text-foreground/80">
                コンテンツミックス (合計100%)
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    ツイート (%)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.content_mix?.tweet ?? 0}
                    onChange={(e) =>
                      updateContentMix("tweet", Number(e.target.value))
                    }
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    スレッド (%)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.content_mix?.thread ?? 0}
                    onChange={(e) =>
                      updateContentMix("thread", Number(e.target.value))
                    }
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    長文 (%)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.content_mix?.long_form ?? 0}
                    onChange={(e) =>
                      updateContentMix("long_form", Number(e.target.value))
                    }
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>
              <p
                className={`text-xs ${
                  contentMixTotal === 100
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                合計: {contentMixTotal}%{" "}
                {contentMixTotal !== 100 && "(100%にしてください)"}
              </p>
            </div>

            {/* Optimal posting times */}
            <div className="space-y-2">
              <Label className="text-foreground/80">
                最適投稿時間 (カンマ区切り)
              </Label>
              <Input
                placeholder='例: 09:00, 12:00, 18:00'
                value={timesInput}
                onChange={(e) => setTimesInput(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>

            {/* Hashtag groups */}
            <div className="space-y-3">
              <Label className="text-foreground/80">
                ハッシュタググループ
              </Label>
              {/* Existing groups */}
              {Object.entries(formData.hashtag_groups ?? {}).map(
                ([groupName, tags]) => (
                  <div
                    key={groupName}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground/90">
                        {groupName}:
                      </span>{" "}
                      <span className="text-sm text-muted-foreground">
                        {tags.join(", ")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveHashtagGroup(groupName)}
                      className="text-red-400 hover:text-red-300 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              )}
              {/* Add new group */}
              <div className="grid grid-cols-[1fr_2fr_auto] gap-2">
                <Input
                  placeholder="グループ名"
                  value={hashtagGroupName}
                  onChange={(e) => setHashtagGroupName(e.target.value)}
                  className="bg-muted border-border text-foreground"
                />
                <Input
                  placeholder="タグ (カンマ区切り)"
                  value={hashtagGroupTags}
                  onChange={(e) => setHashtagGroupTags(e.target.value)}
                  className="bg-muted border-border text-foreground"
                />
                <Button
                  variant="outline"
                  onClick={handleAddHashtagGroup}
                  className="border-border text-foreground/80 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Avoid topics */}
            <div className="space-y-2">
              <Label className="text-foreground/80">
                避けるトピック (カンマ区切り)
              </Label>
              <Input
                placeholder="例: 政治, 宗教"
                value={avoidInput}
                onChange={(e) => setAvoidInput(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>

            {/* Competitor accounts */}
            <div className="space-y-2">
              <Label className="text-foreground/80">
                競合アカウント (カンマ区切り)
              </Label>
              <Input
                placeholder="例: @account1, @account2"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-muted-foreground"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingStrategy ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
