"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiApi } from "@/lib/api-client";

interface AIGenerateFormProps {
  onSelect: (content: string) => void;
}

const styles = [
  { value: "casual", label: "カジュアル" },
  { value: "professional", label: "プロフェッショナル" },
  { value: "humorous", label: "ユーモア" },
  { value: "informative", label: "情報提供" },
  { value: "motivational", label: "モチベーション" },
];

export function AIGenerateForm({ onSelect }: AIGenerateFormProps) {
  const [genre, setGenre] = useState("");
  const [style, setStyle] = useState("casual");
  const [count, setCount] = useState(3);
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!genre.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setSelectedIndex(null);

    try {
      const response = await aiApi.generate({
        genre: genre.trim(),
        style,
        count,
        custom_prompt: customPrompt.trim() || undefined,
      });
      setResults(response.posts);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "AI生成に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    onSelect(results[index]);
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-100 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          AI投稿生成
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">ジャンル</Label>
            <Input
              placeholder="例: テクノロジー、ビジネス、ライフスタイル"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">スタイル</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {styles.map((s) => (
                  <SelectItem
                    key={s.value}
                    value={s.value}
                    className="text-zinc-100 focus:bg-zinc-700"
                  >
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">生成数</Label>
            <Select
              value={String(count)}
              onValueChange={(v) => setCount(Number(v))}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {[1, 2, 3, 5, 10].map((n) => (
                  <SelectItem
                    key={n}
                    value={String(n)}
                    className="text-zinc-100 focus:bg-zinc-700"
                  >
                    {n}件
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">カスタムプロンプト (任意)</Label>
            <Input
              placeholder="追加の指示を入力..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading || !genre.trim()}
          className="w-full gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "生成中..." : "AIで生成"}
        </Button>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <Label className="text-zinc-300">
              生成結果 (クリックして選択)
            </Label>
            <div className="space-y-2">
              {results.map((text, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(index)}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                    selectedIndex === index
                      ? "bg-blue-500/10 border-blue-500/50 text-zinc-100"
                      : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{text}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {text.length}/280文字
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
