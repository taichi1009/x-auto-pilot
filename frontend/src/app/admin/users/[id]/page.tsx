"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type { User } from "@/types";
import Link from "next/link";

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser } = useAuth();
  const userId = Number(params.id);

  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [role, setRole] = useState("");
  const [tier, setTier] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      router.push("/");
      return;
    }

    adminApi
      .getUser(userId)
      .then((u) => {
        setTargetUser(u);
        setRole(u.role);
        setTier(u.subscription_tier);
        setIsActive(u.is_active);
      })
      .catch(() => router.push("/admin"))
      .finally(() => setLoading(false));
  }, [userId, currentUser, router]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await adminApi.updateUser(userId, {
        role,
        is_active: isActive,
        subscription_tier: tier,
      });
      setTargetUser(updated);
      setMessage("保存しました");
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage("保存に失敗しました");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!targetUser) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/admin">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          ユーザー一覧に戻る
        </Button>
      </Link>

      {message && (
        <div
          className={`p-4 rounded-lg text-sm ${
            message.includes("失敗")
              ? "bg-red-500/10 border border-red-500/30 text-red-400"
              : "bg-green-500/10 border border-green-500/30 text-green-400"
          }`}
        >
          {message}
        </div>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            {targetUser.name} ({targetUser.email})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-foreground/80">ロール</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-muted border-border text-foreground w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-muted border-border">
                <SelectItem value="user" className="text-foreground focus:bg-muted">
                  User
                </SelectItem>
                <SelectItem value="admin" className="text-foreground focus:bg-muted">
                  Admin
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80">サブスクリプションティア</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="bg-muted border-border text-foreground w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-muted border-border">
                <SelectItem value="free" className="text-foreground focus:bg-muted">Free</SelectItem>
                <SelectItem value="basic" className="text-foreground focus:bg-muted">Basic</SelectItem>
                <SelectItem value="pro" className="text-foreground focus:bg-muted">Pro</SelectItem>
                <SelectItem value="enterprise" className="text-foreground focus:bg-muted">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground/80">アカウント有効</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                無効にするとログインできなくなります
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
