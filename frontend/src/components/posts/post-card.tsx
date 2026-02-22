"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Send, Pencil, Trash2, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import {
  formatDate,
  truncateText,
  getStatusColor,
  getStatusLabel,
  getPostTypeLabel,
  getPostFormatLabel,
  getPostFormatColor,
} from "@/lib/utils";
import type { Post } from "@/types";

interface PostCardProps {
  post: Post;
  onPublish?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function PostCard({ post, onPublish, onEdit, onDelete }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isLongForm = post.post_format === "long_form";
  const isThread = post.post_format === "thread";
  const shouldTruncate = isLongForm && post.content.length > 200;

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Content */}
            <p className="text-sm text-zinc-100 whitespace-pre-wrap break-words">
              {shouldTruncate && !expanded
                ? truncateText(post.content, 200)
                : post.content}
            </p>

            {/* Expand/Collapse for long form */}
            {shouldTruncate && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> 折りたたむ
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> 全文を表示
                  </>
                )}
              </button>
            )}

            {/* Thread preview */}
            {isThread && post.thread_posts && post.thread_posts.length > 0 && (
              <div className="mt-2 pl-3 border-l-2 border-zinc-700 space-y-1">
                {post.thread_posts.slice(0, expanded ? undefined : 2).map((tp) => (
                  <p key={tp.id} className="text-xs text-zinc-400">
                    <span className="text-zinc-500 font-mono">
                      {tp.thread_order}.
                    </span>{" "}
                    {truncateText(tp.content, 100)}
                  </p>
                ))}
                {!expanded && post.thread_posts.length > 2 && (
                  <button
                    onClick={() => setExpanded(true)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    +{post.thread_posts.length - 2}件のツイート
                  </button>
                )}
              </div>
            )}

            {/* Badges */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge
                variant="outline"
                className={getStatusColor(post.status)}
              >
                {getStatusLabel(post.status)}
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                {getPostTypeLabel(post.post_type)}
              </Badge>
              {post.post_format && post.post_format !== "tweet" && (
                <Badge
                  variant="outline"
                  className={getPostFormatColor(post.post_format)}
                >
                  {getPostFormatLabel(post.post_format)}
                </Badge>
              )}
              {isThread && post.thread_posts && post.thread_posts.length > 0 && (
                <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                  {post.thread_posts.length}ツイート
                </Badge>
              )}
              {post.predicted_impressions && (
                <Badge variant="outline" className="border-zinc-700 text-zinc-400 gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {post.predicted_impressions.toLocaleString()}
                </Badge>
              )}
              <span className="text-xs text-zinc-500">
                {formatDate(post.created_at)}
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              {post.status === "draft" && onPublish && (
                <DropdownMenuItem
                  onClick={() => onPublish(post.id)}
                  className="text-zinc-100 focus:bg-zinc-800 gap-2"
                >
                  <Send className="h-4 w-4" />
                  今すぐ投稿
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem
                  onClick={() => onEdit(post.id)}
                  className="text-zinc-100 focus:bg-zinc-800 gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  編集
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(post.id)}
                  className="text-red-400 focus:bg-zinc-800 focus:text-red-400 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  削除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
