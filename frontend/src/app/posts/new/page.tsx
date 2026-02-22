"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Send, Loader2, ArrowLeft } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { AIGenerateForm } from "@/components/posts/ai-generate-form";
import { postsApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function NewPostPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<string>("original");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = content.length;
  const maxChars = 280;
  const isOverLimit = charCount > maxChars;

  const getCharCountColor = () => {
    if (charCount > maxChars) return "text-red-400";
    if (charCount > maxChars * 0.9) return "text-yellow-400";
    return "text-zinc-500";
  };

  const handleAISelect = (text: string) => {
    setContent(text);
    setPostType("ai_generated");
  };

  const handleSaveDraft = async () => {
    if (!content.trim() || isOverLimit) return;
    setSaving(true);
    setError(null);

    try {
      await postsApi.create({
        content: content.trim(),
        status: "draft",
        post_type: postType,
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
    if (!content.trim() || isOverLimit) return;
    setPublishing(true);
    setError(null);

    try {
      const post = await postsApi.create({
        content: content.trim(),
        status: "draft",
        post_type: postType,
      });
      await postsApi.publish(post.id);
      router.push("/posts");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "投稿に失敗しました"
      );
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">本文</Label>
              <span
                className={cn(
                  "text-sm font-mono tabular-nums",
                  getCharCountColor()
                )}
              >
                {charCount}/{maxChars}
              </span>
            </div>
            <Textarea
              placeholder="投稿内容を入力してください..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className={cn(
                "bg-zinc-800 border-zinc-700 text-zinc-100 resize-none",
                isOverLimit && "border-red-500/50 focus-visible:ring-red-500/50"
              )}
            />
            {isOverLimit && (
              <p className="text-xs text-red-400">
                文字数制限を超えています。{charCount - maxChars}文字削減してください。
              </p>
            )}
          </div>

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
              disabled={!content.trim() || isOverLimit || saving || publishing}
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
              disabled={!content.trim() || isOverLimit || saving || publishing}
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
      <AIGenerateForm onSelect={handleAISelect} />
    </div>
  );
}
