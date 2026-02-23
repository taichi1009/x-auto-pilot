"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Key,
  Shield,
  Sliders,
  Zap,
  CreditCard,
  Crown,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { settingsApi, autoPilotApi, paymentApi } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type { AppSetting, AutoPilotStatus } from "@/types";

interface SettingsState {
  x_api_key: string;
  x_api_secret: string;
  x_access_token: string;
  x_access_token_secret: string;
  x_bearer_token: string;
  claude_api_key: string;
  openai_api_key: string;
  ai_provider: string;
  api_tier: string;
  default_genre: string;
  default_interval: string;
  auto_follow_enabled: boolean;
  pdca_auto_apply: boolean;
  language: string;
}

const defaultSettings: SettingsState = {
  x_api_key: "",
  x_api_secret: "",
  x_access_token: "",
  x_access_token_secret: "",
  x_bearer_token: "",
  claude_api_key: "",
  openai_api_key: "",
  ai_provider: "claude",
  api_tier: "free",
  default_genre: "",
  default_interval: "60",
  auto_follow_enabled: false,
  pdca_auto_apply: false,
  language: "ja",
};

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    tier: "free",
    features: ["投稿作成・下書き", "AI投稿生成", "テンプレート管理", "スケジュール投稿"],
  },
  {
    name: "Basic",
    price: "$50",
    tier: "basic",
    features: ["Freeの全機能", "フォロー管理", "分析・統計", "10,000 API/月"],
  },
  {
    name: "Pro",
    price: "$100",
    tier: "pro",
    features: ["Basicの全機能", "PDCA自動化", "100,000 API/月", "優先サポート"],
  },
  {
    name: "Enterprise",
    price: "$120",
    tier: "enterprise",
    features: ["Proの全機能", "無制限API", "カスタム連携", "専任サポート"],
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const {
    data: settingsData,
    loading,
  } = useApi<AppSetting[]>(useCallback(() => settingsApi.get(), []));

  // Auto-Pilot settings
  const [apSettings, setApSettings] = useState<AutoPilotStatus>({
    enabled: false,
    auto_post_enabled: true,
    auto_post_count: 3,
    auto_post_with_image: true,
    auto_follow_enabled: false,
    auto_follow_keywords: "",
    auto_follow_daily_limit: 10,
  });
  const [apSaving, setApSaving] = useState(false);

  useEffect(() => {
    autoPilotApi.status().then(setApSettings).catch(() => {});
  }, []);

  const handleSaveAutoPilot = async () => {
    setApSaving(true);
    try {
      const result = await autoPilotApi.updateSettings(apSettings);
      setApSettings(result);
      setSaveMessage("Auto-Pilot設定を保存しました");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage("Auto-Pilot設定の保存に失敗しました");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setApSaving(false);
    }
  };

  // Populate settings from API data
  useEffect(() => {
    if (!settingsData) return;

    const map: Record<string, string> = {};
    settingsData.forEach((s) => {
      map[s.key] = s.value;
    });

    setSettings({
      x_api_key: map["x_api_key"] ?? "",
      x_api_secret: map["x_api_secret"] ?? "",
      x_access_token: map["x_access_token"] ?? "",
      x_access_token_secret: map["x_access_token_secret"] ?? "",
      x_bearer_token: map["x_bearer_token"] ?? "",
      claude_api_key: map["claude_api_key"] ?? "",
      openai_api_key: map["openai_api_key"] ?? "",
      ai_provider: map["ai_provider"] ?? "claude",
      api_tier: map["api_tier"] ?? "free",
      default_genre: map["default_genre"] ?? "",
      default_interval: map["default_interval"] ?? "60",
      auto_follow_enabled: map["auto_follow_enabled"] === "true",
      pdca_auto_apply: map["pdca_auto_apply"] === "true",
      language: map["language"] ?? "ja",
    });
  }, [settingsData]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const entries = Object.entries(settings);
      for (const [key, value] of entries) {
        const strValue =
          typeof value === "boolean" ? String(value) : String(value);
        await settingsApi.update(key, strValue);
      }
      setSaveMessage("設定を保存しました");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage("設定の保存に失敗しました");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await settingsApi.testConnection();
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message:
          err instanceof Error ? err.message : "接続テストに失敗しました",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCheckout = async (tier: string) => {
    setCheckingOut(tier);
    try {
      const { url } = await paymentApi.checkout(tier);
      window.location.href = url;
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : "決済の開始に失敗しました"
      );
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setCheckingOut(null);
    }
  };

  const handlePortal = async () => {
    try {
      const { url } = await paymentApi.portal();
      window.location.href = url;
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : "ポータルを開けませんでした"
      );
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {saveMessage && (
        <div
          className={`p-4 rounded-lg text-sm ${
            saveMessage.includes("失敗")
              ? "bg-red-500/10 border border-red-500/30 text-red-400"
              : "bg-green-500/10 border border-green-500/30 text-green-400"
          }`}
        >
          {saveMessage}
        </div>
      )}

      {/* X API Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-400" />
            X API設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground/80">API Key</Label>
              <Input
                type="password"
                placeholder="API Keyを入力"
                value={settings.x_api_key}
                onChange={(e) =>
                  setSettings({ ...settings, x_api_key: e.target.value })
                }
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground/80">API Secret</Label>
              <Input
                type="password"
                placeholder="API Secretを入力"
                value={settings.x_api_secret}
                onChange={(e) =>
                  setSettings({ ...settings, x_api_secret: e.target.value })
                }
                className="bg-muted border-border text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground/80">Access Token</Label>
              <Input
                type="password"
                placeholder="Access Tokenを入力"
                value={settings.x_access_token}
                onChange={(e) =>
                  setSettings({ ...settings, x_access_token: e.target.value })
                }
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground/80">Access Token Secret</Label>
              <Input
                type="password"
                placeholder="Access Token Secretを入力"
                value={settings.x_access_token_secret}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    x_access_token_secret: e.target.value,
                  })
                }
                className="bg-muted border-border text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80">Bearer Token</Label>
            <Input
              type="password"
              placeholder="Bearer Tokenを入力"
              value={settings.x_bearer_token}
              onChange={(e) =>
                setSettings({ ...settings, x_bearer_token: e.target.value })
              }
              className="bg-muted border-border text-foreground"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing}
              className="gap-2"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              接続テスト
            </Button>
            {testResult && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  testResult.success ? "text-green-400" : "text-red-400"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResult.message}
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-400" />
            サブスクリプションプラン
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user?.role === "admin" ? (
            <div className="p-6 text-center rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Crown className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <p className="text-foreground font-medium">管理者アカウント</p>
              <p className="text-sm text-muted-foreground mt-1">全機能を無料でご利用いただけます</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {pricingPlans.map((plan) => {
                  const isCurrent = user?.subscription_tier === plan.tier;
                  return (
                    <div
                      key={plan.tier}
                      className={`rounded-lg border p-4 ${
                        isCurrent
                          ? "border-blue-500 bg-blue-500/5"
                          : "border-border"
                      }`}
                    >
                      <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {plan.price}
                        <span className="text-sm text-muted-foreground font-normal">/月</span>
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {plan.features.map((f) => (
                          <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4">
                        {isCurrent ? (
                          <Badge variant="outline" className="w-full justify-center border-blue-500/30 text-blue-400">
                            現在のプラン
                          </Badge>
                        ) : plan.tier === "free" ? (
                          <Badge variant="outline" className="w-full justify-center border-border text-muted-foreground">
                            無料
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleCheckout(plan.tier)}
                            disabled={checkingOut === plan.tier}
                          >
                            {checkingOut === plan.tier ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "登録"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {user?.subscription_tier && user.subscription_tier !== "free" && (
                <Button variant="outline" onClick={handlePortal} className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  サブスクリプション管理
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Provider Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Key className="h-5 w-5 text-purple-400" />
            AIプロバイダー設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground/80">AIプロバイダー</Label>
            <Select
              value={settings.ai_provider}
              onValueChange={(v) =>
                setSettings({ ...settings, ai_provider: v })
              }
            >
              <SelectTrigger className="bg-muted border-border text-foreground w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-muted border-border">
                <SelectItem
                  value="claude"
                  className="text-foreground focus:bg-muted"
                >
                  Claude
                </SelectItem>
                <SelectItem
                  value="openai"
                  className="text-foreground focus:bg-muted"
                >
                  OpenAI
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-muted" />

          <div className="space-y-2">
            <Label className="text-foreground/80">Claude API Key</Label>
            <Input
              type="password"
              placeholder="Claude API Keyを入力"
              value={settings.claude_api_key}
              onChange={(e) =>
                setSettings({ ...settings, claude_api_key: e.target.value })
              }
              className="bg-muted border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80">OpenAI API Key</Label>
            <Input
              type="password"
              placeholder="OpenAI API Keyを入力"
              value={settings.openai_api_key}
              onChange={(e) =>
                setSettings({ ...settings, openai_api_key: e.target.value })
              }
              className="bg-muted border-border text-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Sliders className="h-5 w-5 text-muted-foreground" />
            一般設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground/80 flex items-center gap-1.5">
              <Languages className="h-4 w-4" />
              AI投稿の言語
            </Label>
            <Select
              value={settings.language}
              onValueChange={(v) =>
                setSettings({ ...settings, language: v })
              }
            >
              <SelectTrigger className="bg-muted border-border text-foreground w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-muted border-border">
                <SelectItem value="ja" className="text-foreground focus:bg-muted">
                  日本語
                </SelectItem>
                <SelectItem value="en" className="text-foreground focus:bg-muted">
                  English
                </SelectItem>
                <SelectItem value="zh" className="text-foreground focus:bg-muted">
                  中文
                </SelectItem>
                <SelectItem value="ko" className="text-foreground focus:bg-muted">
                  한국어
                </SelectItem>
                <SelectItem value="es" className="text-foreground focus:bg-muted">
                  Español
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              AI生成コンテンツの言語を選択します
            </p>
          </div>

          <Separator className="bg-muted" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground/80">デフォルトジャンル</Label>
              <Input
                placeholder="例: テクノロジー"
                value={settings.default_genre}
                onChange={(e) =>
                  setSettings({ ...settings, default_genre: e.target.value })
                }
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground/80">
                デフォルト投稿間隔 (分)
              </Label>
              <Input
                type="number"
                placeholder="60"
                value={settings.default_interval}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_interval: e.target.value,
                  })
                }
                className="bg-muted border-border text-foreground"
              />
            </div>
          </div>

          <Separator className="bg-muted" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground/80">自動フォロー</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  スケジュールに基づいて自動的にフォローを実行
                </p>
              </div>
              <Switch
                checked={settings.auto_follow_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_follow_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground/80">PDCA自動適用</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  分析結果に基づいて自動的に設定を最適化
                </p>
              </div>
              <Switch
                checked={settings.pdca_auto_apply}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, pdca_auto_apply: checked })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Pilot Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-400" />
            Auto-Pilot設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground/80">Auto-Pilot</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                全自動運用モードのマスタースイッチ
              </p>
            </div>
            <Switch
              checked={apSettings.enabled}
              onCheckedChange={(checked) =>
                setApSettings({ ...apSettings, enabled: checked })
              }
            />
          </div>

          <Separator className="bg-muted" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground/80">自動投稿</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AIを使って毎日自動で投稿を生成・公開
                </p>
              </div>
              <Switch
                checked={apSettings.auto_post_enabled}
                onCheckedChange={(checked) =>
                  setApSettings({ ...apSettings, auto_post_enabled: checked })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground/80">1日の投稿数</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={apSettings.auto_post_count}
                  onChange={(e) =>
                    setApSettings({ ...apSettings, auto_post_count: Number(e.target.value) })
                  }
                  className="bg-muted border-border text-foreground w-24"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground/80">画像自動生成</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  投稿にAI生成画像を自動で添付
                </p>
              </div>
              <Switch
                checked={apSettings.auto_post_with_image}
                onCheckedChange={(checked) =>
                  setApSettings({ ...apSettings, auto_post_with_image: checked })
                }
              />
            </div>
          </div>

          <Separator className="bg-muted" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground/80">自動フォロー</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  キーワードに基づいて自動的にフォロー
                </p>
              </div>
              <Switch
                checked={apSettings.auto_follow_enabled}
                onCheckedChange={(checked) =>
                  setApSettings({ ...apSettings, auto_follow_enabled: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">フォロー対象キーワード</Label>
              <Input
                placeholder="例: AI, プログラミング, スタートアップ"
                value={apSettings.auto_follow_keywords}
                onChange={(e) =>
                  setApSettings({ ...apSettings, auto_follow_keywords: e.target.value })
                }
                className="bg-muted border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                カンマ区切りでキーワードを入力
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">1日のフォロー上限</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={apSettings.auto_follow_daily_limit}
                onChange={(e) =>
                  setApSettings({ ...apSettings, auto_follow_daily_limit: Number(e.target.value) })
                }
                className="bg-muted border-border text-foreground w-24"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveAutoPilot} disabled={apSaving} className="gap-2">
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

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          設定を保存
        </Button>
      </div>
    </div>
  );
}
