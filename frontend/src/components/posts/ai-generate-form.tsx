"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiApi } from "@/lib/api-client";
import { getMaxCharsForFormat } from "@/lib/utils";
import type { PostFormat } from "@/types";

interface AIGenerateFormProps {
  onSelect: (content: string) => void;
  onSelectThread?: (threads: string[]) => void;
  postFormat?: PostFormat;
}

const styles = [
  { value: "casual", label: "カジュアル" },
  { value: "professional", label: "プロフェッショナル" },
  { value: "humorous", label: "ユーモア" },
  { value: "informative", label: "情報提供" },
  { value: "motivational", label: "モチベーション" },
];

export function AIGenerateForm({
  onSelect,
  onSelectThread,
  postFormat = "tweet",
}: AIGenerateFormProps) {
  const [genre, setGenre] = useState("");
  const [style, setStyle] = useState("casual");
  const [count, setCount] = useState(3);
  const [customPrompt, setCustomPrompt] = useState("");
  const [usePersona, setUsePersona] = useState(false);
  const [threadLength, setThreadLength] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [threadResults, setThreadResults] = useState<string[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!genre.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setThreadResults([]);
    setSelectedIndex(null);

    try {
      const response = await aiApi.generate({
        genre: genre.trim(),
        style,
        count: postFormat === "thread" ? 1 : count,
        custom_prompt: customPrompt.trim() || undefined,
        post_format: postFormat,
        use_persona: usePersona,
        thread_length: threadLength,
      });
      if (postFormat === "thread" && response.threads) {
        setThreadResults(response.threads);
        setResults(response.posts);
      } else {
        setResults(response.posts);
      }
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
    if (postFormat === "thread" && threadResults[index] && onSelectThread) {
      onSelectThread(threadResults[index]);
    } else {
      onSelect(results[index]);
    }
  };

  const maxChars = getMaxCharsForFormat(postFormat);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          AI投稿生成
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground/80">ジャンル</Label>
            <Input
              placeholder="例: テクノロジー、ビジネス、ライフスタイル"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="bg-muted border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80">スタイル</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-muted border-border">
                {styles.map((s) => (
                  <SelectItem
                    key={s.value}
                    value={s.value}
                    className="text-foreground focus:bg-muted"
                  >
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {postFormat !== "thread" && (
            <div className="space-y-2">
              <Label className="text-foreground/80">生成数</Label>
              <Select
                value={String(count)}
                onValueChange={(v) => setCount(Number(v))}
              >
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border">
                  {[1, 2, 3, 5, 10].map((n) => (
                    <SelectItem
                      key={n}
                      value={String(n)}
                      className="text-foreground focus:bg-muted"
                    >
                      {n}件
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {postFormat === "thread" && (
            <div className="space-y-2">
              <Label className="text-foreground/80">
                スレッド長さ ({threadLength}ツイート)
              </Label>
              <input
                type="range"
                min={2}
                max={25}
                value={threadLength}
                onChange={(e) => setThreadLength(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2</span>
                <span>25</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-foreground/80">カスタムプロンプト (任意)</Label>
            <Input
              placeholder="追加の指示を入力..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="bg-muted border-border text-foreground"
            />
          </div>
        </div>

        {/* Persona toggle */}
        <div className="flex items-center gap-3">
          <Switch
            checked={usePersona}
            onCheckedChange={setUsePersona}
          />
          <Label className="text-foreground/80">ペルソナを使用</Label>
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

        {/* Thread results */}
        {postFormat === "thread" && threadResults.length > 0 && (
          <div className="space-y-2">
            <Label className="text-foreground/80">
              生成結果 (クリックして選択)
            </Label>
            <div className="space-y-3">
              {threadResults.map((thread, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(index)}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                    selectedIndex === index
                      ? "bg-blue-500/10 border-blue-500/50 text-foreground"
                      : "bg-muted/50 border-border text-foreground/80 hover:border-border"
                  }`}
                >
                  {thread.map((tweet, tIdx) => (
                    <div key={tIdx} className="flex gap-2 mb-2">
                      <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">
                        {tIdx + 1}.
                      </span>
                      <div>
                        <p className="whitespace-pre-wrap">{tweet}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tweet.length}/280
                        </p>
                      </div>
                    </div>
                  ))}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Regular post results */}
        {postFormat !== "thread" && results.length > 0 && (
          <div className="space-y-2">
            <Label className="text-foreground/80">
              生成結果 (クリックして選択)
            </Label>
            <div className="space-y-2">
              {results.map((text, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(index)}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                    selectedIndex === index
                      ? "bg-blue-500/10 border-blue-500/50 text-foreground"
                      : "bg-muted/50 border-border text-foreground/80 hover:border-border"
                  }`}
                >
                  <p className={`whitespace-pre-wrap ${postFormat === "long_form" ? "max-h-40 overflow-y-auto" : ""}`}>
                    {text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {text.length}/{maxChars.toLocaleString()}文字
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
