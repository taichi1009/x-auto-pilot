"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Send, Pencil, Trash2 } from "lucide-react";
import {
  formatDate,
  truncateText,
  getStatusColor,
  getStatusLabel,
  getPostTypeLabel,
} from "@/lib/utils";
import type { Post } from "@/types";

interface PostCardProps {
  post: Post;
  onPublish?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function PostCard({ post, onPublish, onEdit, onDelete }: PostCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-100 whitespace-pre-wrap break-words">
              {truncateText(post.content, 200)}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Badge
                variant="outline"
                className={getStatusColor(post.status)}
              >
                {getStatusLabel(post.status)}
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                {getPostTypeLabel(post.post_type)}
              </Badge>
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
