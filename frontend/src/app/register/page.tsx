"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register(email, password, name);
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-foreground">
            X Auto-Pilot
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            新規アカウント作成
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-foreground/80">名前</Label>
              <Input
                type="text"
                placeholder="名前を入力"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-muted border-border text-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">メールアドレス</Label>
              <Input
                type="email"
                placeholder="メールアドレスを入力"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted border-border text-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">パスワード</Label>
              <Input
                type="password"
                placeholder="6文字以上"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted border-border text-foreground"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              アカウント作成
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            既にアカウントをお持ちですか？{" "}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300"
            >
              ログイン
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
