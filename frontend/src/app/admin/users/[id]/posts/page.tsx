"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Send, Loader2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PostCard } from "@/components/posts/post-card";
import { useApi } from "@/hooks/use-api";
import { adminApi } from "@/lib/api-client";
import type { Post } from "@/types";

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
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [publishAfterCreate, setPublishAfterCreate] = useState(false);

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

  const handleCreate = async (publish: boolean) => {
    if (!newContent.trim()) return;
    setCreating(true);
    setPublishAfterCreate(publish);
    try {
      const post = await adminApi.postCreate(userId, {
        content: newContent.trim(),
        status: "draft",
        post_type: "original",
      });
      if (publish) {
        await adminApi.postPublish(userId, post.id);
      }
      setNewContent("");
      setShowCreate(false);
      refetch();
    } catch {
      // Error handling
    } finally {
      setCreating(false);
      setPublishAfterCreate(false);
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
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          新規投稿
        </Button>
      </div>

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
              onDelete={(id) => setDeleteTarget(id)}
            />
          ))}
        </div>
      )}

      {/* Create post dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">新規投稿</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              このユーザーとして投稿を作成します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground/80">本文</Label>
              <Textarea
                placeholder="投稿内容を入力してください..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={6}
                className="bg-muted border-border text-foreground resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {newContent.length}/280
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleCreate(false)}
              disabled={creating || !newContent.trim()}
              className="gap-2"
            >
              {creating && !publishAfterCreate ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              下書き保存
            </Button>
            <Button
              onClick={() => handleCreate(true)}
              disabled={creating || !newContent.trim()}
              className="gap-2"
            >
              {creating && publishAfterCreate ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              今すぐ投稿
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
