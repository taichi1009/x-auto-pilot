"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { postsApi } from "@/lib/api-client";
import type { Post } from "@/types";

type FilterStatus = "all" | "draft" | "scheduled" | "posted" | "failed";

const filterTabs: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "draft", label: "下書き" },
  { value: "scheduled", label: "予約済み" },
  { value: "posted", label: "投稿済み" },
  { value: "failed", label: "失敗" },
];

export default function PostsPage() {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const {
    data: posts,
    loading,
    error,
    refetch,
  } = useApi<Post[]>(
    useCallback(
      () =>
        postsApi.list(
          filter !== "all" ? { status: filter, limit: 100 } : { limit: 100 }
        ),
      [filter]
    )
  );

  const handlePublish = async (id: number) => {
    setActionLoading(true);
    try {
      await postsApi.publish(id);
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
      await postsApi.delete(deleteTarget);
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
          <TabsList className="bg-zinc-800/50 border border-zinc-700">
            {filterTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400"
              >
                {tab.label}
                {tab.value !== "all" && posts && (
                  <Badge
                    variant="outline"
                    className="ml-1.5 h-5 px-1 text-[10px] border-zinc-600"
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

        <Link href="/posts/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            新規投稿
          </Button>
        </Link>
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
              className="h-24 rounded-lg bg-zinc-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16">
          <Send className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">
            投稿がありません
          </h3>
          <p className="text-sm text-zinc-500 mb-6">
            新しい投稿を作成して始めましょう
          </p>
          <Link href="/posts/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              新規投稿を作成
            </Button>
          </Link>
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

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">投稿を削除</DialogTitle>
            <DialogDescription className="text-zinc-400">
              この投稿を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              className="text-zinc-400"
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
