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

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed"
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
            アカウントにログイン
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
              <Label className="text-foreground/80">メールアドレス</Label>
              <Input
                type="email"
                placeholder="admin@example.com"
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
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted border-border text-foreground"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              ログイン
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            アカウントをお持ちでないですか？{" "}
            <Link
              href="/register"
              className="text-blue-400 hover:text-blue-300"
            >
              新規登録
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
