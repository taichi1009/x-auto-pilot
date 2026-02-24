"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Send,
  Loader2,
  Plus,
  Save,
  TrendingUp,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PostCard } from "@/components/posts/post-card";
import { AIGenerateForm } from "@/components/posts/ai-generate-form";
import { useApi } from "@/hooks/use-api";
import { adminApi, aiApi } from "@/lib/api-client";
import {
  cn,
  getMaxCharsForFormat,
  getPostFormatLabel,
  getPostFormatColor,
} from "@/lib/utils";
import type { Post, PostFormat, ImpressionPrediction } from "@/types";

type FilterStatus = "all" | "draft" | "scheduled" | "posted" | "failed";

const filterTabs: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "draft", label: "下書き" },
  { value: "scheduled", label: "予約済み" },
  { value: "posted", label: "投稿済み" },
  { value: "failed", label: "失敗" },
];

export default function AdminPostsPage() {
  const params = useParams();
  const userId = Number(params.id);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Inline form state
  const [showForm, setShowForm] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<string>("original");
  const [postFormat, setPostFormat] = useState<PostFormat>("tweet");
  const [threadContents, setThreadContents] = useState<string[]>(["", ""]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<ImpressionPrediction | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: posts,
    loading,
    error,
    refetch,
  } = useApi<Post[]>(
    useCallback(
      () =>
        adminApi.postList(
          userId,
          filter !== "all" ? { status: filter, limit: 100 } : { limit: 100 }
        ),
      [userId, filter]
    )
  );

  // --- Form helpers ---

  const maxChars = getMaxCharsForFormat(postFormat);
  const charCount = postFormat === "thread" ? 0 : content.length;
  const isOverLimit = postFormat !== "thread" && charCount > maxChars;

  const getCharCountColor = () => {
    if (charCount > maxChars) return "text-red-400";
    if (charCount > maxChars * 0.9) return "text-yellow-400";
    return "text-muted-foreground";
  };

  const resetForm = () => {
    setContent("");
    setPostType("original");
    setPostFormat("tweet");
    setThreadContents(["", ""]);
    setPrediction(null);
    setFormError(null);
    setEditingPostId(null);
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleFormatChange = (format: PostFormat) => {
    setPostFormat(format);
    setPrediction(null);
    if (format === "thread" && threadContents.length < 2) {
      setThreadContents(["", ""]);
    }
  };

  const handleThreadContentChange = (index: number, value: string) => {
    const updated = [...threadContents];
    updated[index] = value;
    setThreadContents(updated);
  };

  const addThreadTweet = () => {
    if (threadContents.length < 25) {
      setThreadContents([...threadContents, ""]);
    }
  };

  const removeThreadTweet = (index: number) => {
    if (threadContents.length > 2) {
      setThreadContents(threadContents.filter((_, i) => i !== index));
    }
  };

  const handleAISelect = (text: string) => {
    setContent(text);
    setPostType("ai_generated");
  };

  const handleAISelectThread = (threads: string[]) => {
    setThreadContents(threads);
    setPostType("ai_generated");
  };

  const handlePredict = async () => {
    const contentToPredict =
      postFormat === "thread" ? threadContents.join("\n\n") : content;
    if (!contentToPredict.trim()) return;

    setPredicting(true);
    try {
      const result = await aiApi.predict({
        content: contentToPredict,
        post_format: postFormat,
      });
      setPrediction(result);
    } catch {
      setFormError("インプレッション予測に失敗しました");
    } finally {
      setPredicting(false);
    }
  };

  const getPostContent = () => {
    if (postFormat === "thread") {
      return threadContents[0] || "Thread";
    }
    return content.trim();
  };

  const isContentValid = () => {
    if (postFormat === "thread") {
      return threadContents.some((t) => t.trim().length > 0);
    }
    return content.trim().length > 0 && !isOverLimit;
  };

  // --- Actions ---

  const handleSaveDraft = async () => {
    if (!isContentValid()) return;
    setSaving(true);
    setFormError(null);

    try {
      if (editingPostId) {
        await adminApi.postUpdate(userId, editingPostId, {
          content: getPostContent(),
          post_type: postType,
          post_format: postFormat,
          thread_contents:
            postFormat === "thread" ? threadContents.filter((t) => t.trim()) : undefined,
        });
      } else {
        await adminApi.postCreate(userId, {
          content: getPostContent(),
          status: "draft",
          post_type: postType,
          post_format: postFormat,
          thread_contents:
            postFormat === "thread" ? threadContents.filter((t) => t.trim()) : undefined,
        });
      }
      closeForm();
      refetch();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "保存に失敗しました"
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePublishNew = async () => {
    if (!isContentValid()) return;
    setPublishing(true);
    setFormError(null);

    try {
      if (editingPostId) {
        await adminApi.postUpdate(userId, editingPostId, {
          content: getPostContent(),
          post_type: postType,
          post_format: postFormat,
          thread_contents:
            postFormat === "thread" ? threadContents.filter((t) => t.trim()) : undefined,
        });
        await adminApi.postPublish(userId, editingPostId);
      } else {
        const post = await adminApi.postCreate(userId, {
          content: getPostContent(),
          status: "draft",
          post_type: postType,
          post_format: postFormat,
          thread_contents:
            postFormat === "thread" ? threadContents.filter((t) => t.trim()) : undefined,
        });
        await adminApi.postPublish(userId, post.id);
      }
      closeForm();
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "投稿に失敗しました");
    } finally {
      setPublishing(false);
    }
  };

  const handlePublish = async (id: number) => {
    setActionLoading(true);
    try {
      await adminApi.postPublish(userId, id);
      refetch();
    } catch {
      // Error handling is done by the API client
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    const post = (posts ?? []).find((p) => p.id === id);
    if (!post) return;

    setEditingPostId(id);
    setContent(post.content);
    setPostType(post.post_type);
    setPostFormat(post.post_format || "tweet");
    if (post.post_format === "thread" && post.thread_posts?.length > 0) {
      setThreadContents(
        post.thread_posts
          .sort((a, b) => a.thread_order - b.thread_order)
          .map((tp) => tp.content)
      );
    } else {
      setThreadContents(["", ""]);
    }
    setPrediction(null);
    setFormError(null);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    setActionLoading(true);
    try {
      await adminApi.postDelete(userId, deleteTarget);
      setDeleteTarget(null);
      refetch();
    } catch {
      // Error handling
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPosts = posts ?? [];

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as FilterStatus)}
        >
          <TabsList className="bg-muted/50 border border-border">
            {filterTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground"
              >
                {tab.label}
                {tab.value !== "all" && posts && (
                  <Badge
                    variant="outline"
                    className="ml-1.5 h-5 px-1 text-[10px] border-border"
                  >
                    {
                      (posts ?? []).filter(
                        (p) =>
                          tab.value === "all" || p.status === tab.value
                      ).length
                    }
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button onClick={openNewForm} className="gap-2">
          <Plus className="h-4 w-4" />
          新規投稿
        </Button>
      </div>

      {/* Inline post form */}
      {showForm && (
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-foreground">
                {editingPostId ? "投稿を編集" : "新規投稿"}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeForm}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {formError}
                </div>
              )}

              {/* Format selector */}
              <div className="space-y-2">
                <Label className="text-foreground/80">フォーマット</Label>
                <div className="flex gap-2">
                  {(["tweet", "long_form", "thread"] as PostFormat[]).map(
                    (fmt) => (
                      <button
                        key={fmt}
                        onClick={() => handleFormatChange(fmt)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                          postFormat === fmt
                            ? getPostFormatColor(fmt)
                            : "border-border text-muted-foreground hover:border-border"
                        )}
                      >
                        {getPostFormatLabel(fmt)}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Tweet / Long-form editor */}
              {postFormat !== "thread" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground/80">本文</Label>
                    <span
                      className={cn(
                        "text-sm font-mono tabular-nums",
                        getCharCountColor()
                      )}
                    >
                      {charCount}/{maxChars.toLocaleString()}
                    </span>
                  </div>
                  <Textarea
                    placeholder="投稿内容を入力してください..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={postFormat === "long_form" ? 20 : 6}
                    className={cn(
                      "bg-muted border-border text-foreground resize-none",
                      isOverLimit &&
                        "border-red-500/50 focus-visible:ring-red-500/50"
                    )}
                  />
                  {isOverLimit && (
                    <p className="text-xs text-red-400">
                      文字数制限を超えています。{charCount - maxChars}
                      文字削減してください。
                    </p>
                  )}
                </div>
              )}

              {/* Thread editor */}
              {postFormat === "thread" && (
                <div className="space-y-3">
                  <Label className="text-foreground/80">
                    スレッド ({threadContents.length}ツイート)
                  </Label>
                  {threadContents.map((tweet, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-medium shrink-0 mt-1">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <Textarea
                          placeholder={
                            index === 0
                              ? "フックとなる最初のツイート..."
                              : `ツイート #${index + 1}`
                          }
                          value={tweet}
                          onChange={(e) =>
                            handleThreadContentChange(index, e.target.value)
                          }
                          rows={3}
                          className={cn(
                            "bg-muted border-border text-foreground resize-none",
                            tweet.length > 280 &&
                              "border-red-500/50 focus-visible:ring-red-500/50"
                          )}
                        />
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "text-xs font-mono",
                              tweet.length > 280
                                ? "text-red-400"
                                : tweet.length > 252
                                  ? "text-yellow-400"
                                  : "text-muted-foreground"
                            )}
                          >
                            {tweet.length}/280
                          </span>
                          {threadContents.length > 2 && (
                            <button
                              onClick={() => removeThreadTweet(index)}
                              className="text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {threadContents.length < 25 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addThreadTweet}
                      className="gap-2"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      ツイートを追加
                    </Button>
                  )}
                </div>
              )}

              {/* Impression prediction */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePredict}
                  disabled={
                    predicting ||
                    (!content.trim() && postFormat !== "thread")
                  }
                  className="gap-2"
                >
                  {predicting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                  インプレッション予測
                </Button>
              </div>

              {prediction && (
                <Card className="bg-muted/50 border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-foreground">
                        予測結果
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs border-border text-muted-foreground"
                      >
                        信頼度{" "}
                        {Math.round(prediction.confidence_score * 100)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          インプレッション
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {prediction.predicted_impressions.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">いいね</p>
                        <p className="text-lg font-bold text-foreground">
                          {prediction.predicted_likes.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          リツイート
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {prediction.predicted_retweets.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {prediction.suggestions.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          改善提案
                        </p>
                        <ul className="text-sm text-foreground/80 space-y-1">
                          {prediction.suggestions.map((s, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-blue-400 mt-0.5">-</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Post type selector */}
              <div className="space-y-2">
                <Label className="text-foreground/80">投稿タイプ</Label>
                <Select value={postType} onValueChange={setPostType}>
                  <SelectTrigger className="bg-muted border-border text-foreground w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    <SelectItem
                      value="original"
                      className="text-foreground focus:bg-muted"
                    >
                      オリジナル
                    </SelectItem>
                    <SelectItem
                      value="ai_generated"
                      className="text-foreground focus:bg-muted"
                    >
                      AI生成
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-muted" />

              {/* Action buttons */}
              <div className="flex items-center gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={!isContentValid() || saving || publishing}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  下書き保存
                </Button>
                <Button
                  onClick={handlePublishNew}
                  disabled={!isContentValid() || saving || publishing}
                  className="gap-2"
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  今すぐ投稿
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Generation */}
          <AIGenerateForm
            onSelect={handleAISelect}
            onSelectThread={handleAISelectThread}
            postFormat={postFormat}
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
          投稿の取得に失敗しました: {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16">
          <Send className="h-10 w-10 text-muted-foreground/60 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground/80 mb-2">
            投稿がありません
          </h3>
          <p className="text-sm text-muted-foreground">
            このユーザーの投稿はまだありません
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPublish={handlePublish}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteTarget(id)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">投稿を削除</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              この投稿を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              className="text-muted-foreground"
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading}
              className="gap-2"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
