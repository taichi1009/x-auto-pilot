"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Send,
  Loader2,
  ArrowLeft,
  TrendingUp,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AIGenerateForm } from "@/components/posts/ai-generate-form";
import { postsApi, aiApi } from "@/lib/api-client";
import {
  cn,
  getMaxCharsForFormat,
  getPostFormatLabel,
  getPostFormatColor,
} from "@/lib/utils";
import type { PostFormat, ImpressionPrediction } from "@/types";

export default function NewPostPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<string>("original");
  const [postFormat, setPostFormat] = useState<PostFormat>("tweet");
  const [threadContents, setThreadContents] = useState<string[]>(["", ""]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<ImpressionPrediction | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const maxChars = getMaxCharsForFormat(postFormat);
  const charCount = postFormat === "thread" ? 0 : content.length;
  const isOverLimit = postFormat !== "thread" && charCount > maxChars;

  const getCharCountColor = () => {
    if (charCount > maxChars) return "text-red-400";
    if (charCount > maxChars * 0.9) return "text-yellow-400";
    return "text-zinc-500";
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
      setError("インプレッション予測に失敗しました");
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

  const handleSaveDraft = async () => {
    if (!isContentValid()) return;
    setSaving(true);
    setError(null);

    try {
      await postsApi.create({
        content: getPostContent(),
        status: "draft",
        post_type: postType,
        post_format: postFormat,
        thread_contents:
          postFormat === "thread" ? threadContents.filter((t) => t.trim()) : undefined,
      });
      router.push("/posts");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "下書き保存に失敗しました"
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!isContentValid()) return;
    setPublishing(true);
    setError(null);

    try {
      const post = await postsApi.create({
        content: getPostContent(),
        status: "draft",
        post_type: postType,
        post_format: postFormat,
        thread_contents:
          postFormat === "thread" ? threadContents.filter((t) => t.trim()) : undefined,
      });
      await postsApi.publish(post.id);
      router.push("/posts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "投稿に失敗しました");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/posts"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        投稿一覧に戻る
      </Link>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Post editor */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">投稿内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Format selector */}
          <div className="space-y-2">
            <Label className="text-zinc-300">フォーマット</Label>
            <div className="flex gap-2">
              {(["tweet", "long_form", "thread"] as PostFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleFormatChange(fmt)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                    postFormat === fmt
                      ? getPostFormatColor(fmt)
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  )}
                >
                  {getPostFormatLabel(fmt)}
                </button>
              ))}
            </div>
          </div>

          {/* Tweet / Long-form editor */}
          {postFormat !== "thread" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">本文</Label>
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
                  "bg-zinc-800 border-zinc-700 text-zinc-100 resize-none",
                  isOverLimit &&
                    "border-red-500/50 focus-visible:ring-red-500/50"
                )}
              />
              {isOverLimit && (
                <p className="text-xs text-red-400">
                  文字数制限を超えています。
                  {charCount - maxChars}文字削減してください。
                </p>
              )}
            </div>
          )}

          {/* Thread editor */}
          {postFormat === "thread" && (
            <div className="space-y-3">
              <Label className="text-zinc-300">
                スレッド ({threadContents.length}ツイート)
              </Label>
              {threadContents.map((tweet, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 text-sm font-medium shrink-0 mt-1">
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
                        "bg-zinc-800 border-zinc-700 text-zinc-100 resize-none",
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
                              : "text-zinc-500"
                        )}
                      >
                        {tweet.length}/280
                      </span>
                      {threadContents.length > 2 && (
                        <button
                          onClick={() => removeThreadTweet(index)}
                          className="text-zinc-500 hover:text-red-400 transition-colors"
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
              disabled={predicting || (!content.trim() && postFormat !== "thread")}
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
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-zinc-100">
                    予測結果
                  </span>
                  <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                    信頼度 {Math.round(prediction.confidence_score * 100)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500">インプレッション</p>
                    <p className="text-lg font-bold text-zinc-100">
                      {prediction.predicted_impressions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">いいね</p>
                    <p className="text-lg font-bold text-zinc-100">
                      {prediction.predicted_likes.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">リツイート</p>
                    <p className="text-lg font-bold text-zinc-100">
                      {prediction.predicted_retweets.toLocaleString()}
                    </p>
                  </div>
                </div>
                {prediction.suggestions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500">改善提案</p>
                    <ul className="text-sm text-zinc-300 space-y-1">
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

          <div className="space-y-2">
            <Label className="text-zinc-300">投稿タイプ</Label>
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem
                  value="original"
                  className="text-zinc-100 focus:bg-zinc-700"
                >
                  オリジナル
                </SelectItem>
                <SelectItem
                  value="ai_generated"
                  className="text-zinc-100 focus:bg-zinc-700"
                >
                  AI生成
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-zinc-800" />

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
              onClick={handlePublish}
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
  );
}
