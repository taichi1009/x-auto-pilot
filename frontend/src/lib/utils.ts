import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncateText(text: string, max: number): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "draft":
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    case "scheduled":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "posted":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "failed":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "pending":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "completed":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "下書き";
    case "scheduled":
      return "予約済み";
    case "posted":
      return "投稿済み";
    case "failed":
      return "失敗";
    case "pending":
      return "待機中";
    case "completed":
      return "完了";
    default:
      return status;
  }
}

export function getTierLabel(tier: string): string {
  switch (tier) {
    case "free":
      return "Free";
    case "basic":
      return "Basic";
    case "pro":
      return "Pro";
    default:
      return tier;
  }
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case "free":
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    case "basic":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "pro":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    default:
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  }
}

export function getPostTypeLabel(type: string): string {
  switch (type) {
    case "original":
      return "オリジナル";
    case "ai_generated":
      return "AI生成";
    case "template":
      return "テンプレート";
    default:
      return type;
  }
}

export function getPostFormatLabel(format: string): string {
  switch (format) {
    case "tweet":
      return "ツイート";
    case "long_form":
      return "長文";
    case "thread":
      return "スレッド";
    default:
      return format;
  }
}

export function getPostFormatColor(format: string): string {
  switch (format) {
    case "tweet":
      return "bg-sky-500/20 text-sky-400 border-sky-500/30";
    case "long_form":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "thread":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default:
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  }
}

export function getMaxCharsForFormat(format: string): number {
  switch (format) {
    case "tweet":
      return 280;
    case "long_form":
      return 25000;
    case "thread":
      return 280;
    default:
      return 280;
  }
}
