"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, Save } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import type { User, XOAuthStatus, AutoPilotStatus } from "@/types";

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = Number(params.id);

  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [role, setRole] = useState("");
  const [tier, setTier] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [xStatus, setXStatus] = useState<XOAuthStatus | null>(null);
  const [apStatus, setApStatus] = useState<AutoPilotStatus | null>(null);
  const [apSettings, setApSettings] = useState<Partial<AutoPilotStatus>>({});
  const [apSaving, setApSaving] = useState(false);
  const [apToggling, setApToggling] = useState(false);

  useEffect(() => {
    Promise.all([
      adminApi.getUser(userId),
      adminApi.xOAuthStatus(userId),
      adminApi.autoPilotStatus(userId),
    ])
      .then(([u, xs, ap]) => {
        setTargetUser(u);
        setRole(u.role);
        setTier(u.subscription_tier);
        setIsActive(u.is_active);
        setXStatus(xs);
        setApStatus(ap);
        setApSettings({
          auto_post_enabled: ap.auto_post_enabled,
          auto_post_count: ap.auto_post_count,
          auto_post_with_image: ap.auto_post_with_image,
          auto_follow_enabled: ap.auto_follow_enabled,
          auto_follow_keywords: ap.auto_follow_keywords,
          auto_follow_daily_limit: ap.auto_follow_daily_limit,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

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

  const handleApToggle = async () => {
    setApToggling(true);
    try {
      const updated = await adminApi.autoPilotToggle(userId);
      setApStatus(updated);
      setMessage(updated.enabled ? "Auto-PilotをONにしました" : "Auto-PilotをOFFにしました");
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage("Auto-Pilotの切替に失敗しました");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setApToggling(false);
    }
  };

  const handleApSave = async () => {
    setApSaving(true);
    try {
      const updated = await adminApi.autoPilotUpdateSettings(userId, apSettings);
      setApStatus(updated);
      setMessage("Auto-Pilot設定を保存しました");
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage("Auto-Pilot設定の保存に失敗しました");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setApSaving(false);
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
    <div className="max-w-2xl space-y-6">
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
          <CardTitle className="text-foreground">基本設定</CardTitle>
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

      {/* X Account Connection */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Xアカウント連携</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {xStatus?.connected ? (
                <>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    連携済み
                  </Badge>
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {xStatus.method === "oauth2" ? "OAuth 2.0" : "手動設定"}
                  </Badge>
                  {xStatus.username && (
                    <span className="text-sm text-foreground font-medium">
                      @{xStatus.username}
                    </span>
                  )}
                </>
              ) : (
                <Badge className="bg-muted text-muted-foreground border-border">
                  未連携
                </Badge>
              )}
            </div>
            {xStatus?.connected && xStatus.method === "oauth2" && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await adminApi.xOAuthDisconnect(userId);
                    setXStatus({ connected: false, method: null, username: "", x_user_id: "", token_expired: false });
                    setMessage("X連携を解除しました");
                    setTimeout(() => setMessage(null), 3000);
                  } catch {
                    setMessage("X連携の解除に失敗しました");
                    setTimeout(() => setMessage(null), 3000);
                  }
                }}
                className="text-red-400 border-red-500/30 hover:bg-red-500/10"
              >
                連携解除
              </Button>
            )}
          </div>
          {xStatus?.token_expired && (
            <p className="text-sm text-amber-400">
              トークンの有効期限が切れています
            </p>
          )}
        </CardContent>
      </Card>

      {/* Auto-Pilot Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Auto-Pilot設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground/80">Auto-Pilot</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                自動投稿・自動フォローを有効にします
              </p>
            </div>
            <div className="flex items-center gap-2">
              {apStatus?.enabled ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  ON
                </Badge>
              ) : (
                <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                  OFF
                </Badge>
              )}
              <Switch
                checked={apStatus?.enabled ?? false}
                onCheckedChange={handleApToggle}
                disabled={apToggling}
              />
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">自動投稿</h4>
              <div className="flex items-center justify-between">
                <Label className="text-foreground/80 text-sm">自動投稿を有効にする</Label>
                <Switch
                  checked={apSettings.auto_post_enabled ?? false}
                  onCheckedChange={(v) => setApSettings((s) => ({ ...s, auto_post_enabled: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-foreground/80 text-sm">1日の投稿数</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="w-20 bg-muted border-border text-foreground"
                  value={apSettings.auto_post_count ?? 3}
                  onChange={(e) => setApSettings((s) => ({ ...s, auto_post_count: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-foreground/80 text-sm">画像付き投稿</Label>
                <Switch
                  checked={apSettings.auto_post_with_image ?? false}
                  onCheckedChange={(v) => setApSettings((s) => ({ ...s, auto_post_with_image: v }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">自動フォロー</h4>
              <div className="flex items-center justify-between">
                <Label className="text-foreground/80 text-sm">自動フォローを有効にする</Label>
                <Switch
                  checked={apSettings.auto_follow_enabled ?? false}
                  onCheckedChange={(v) => setApSettings((s) => ({ ...s, auto_follow_enabled: v }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground/80 text-sm">キーワード</Label>
                <Input
                  className="bg-muted border-border text-foreground"
                  placeholder="カンマ区切りでキーワードを入力"
                  value={apSettings.auto_follow_keywords ?? ""}
                  onChange={(e) => setApSettings((s) => ({ ...s, auto_follow_keywords: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-foreground/80 text-sm">1日のフォロー上限</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  className="w-20 bg-muted border-border text-foreground"
                  value={apSettings.auto_follow_daily_limit ?? 10}
                  onChange={(e) => setApSettings((s) => ({ ...s, auto_follow_daily_limit: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleApSave} disabled={apSaving} className="gap-2">
              {apSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Auto-Pilot設定を保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
