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
import { settingsApi } from "@/lib/api-client";
import type { AppSetting } from "@/types";

interface SettingsState {
  x_api_key: string;
  x_api_secret: string;
  x_access_token: string;
  x_access_token_secret: string;
  x_bearer_token: string;
  claude_api_key: string;
  api_tier: string;
  default_genre: string;
  default_interval: string;
  auto_follow_enabled: boolean;
  pdca_auto_apply: boolean;
}

const defaultSettings: SettingsState = {
  x_api_key: "",
  x_api_secret: "",
  x_access_token: "",
  x_access_token_secret: "",
  x_bearer_token: "",
  claude_api_key: "",
  api_tier: "free",
  default_genre: "",
  default_interval: "60",
  auto_follow_enabled: false,
  pdca_auto_apply: false,
};

const tierFeatures = [
  { feature: "投稿 (作成・下書き)", free: true, basic: true, pro: true },
  { feature: "AI投稿生成", free: true, basic: true, pro: true },
  { feature: "テンプレート管理", free: true, basic: true, pro: true },
  { feature: "スケジュール投稿", free: true, basic: true, pro: true },
  { feature: "フォロー管理", free: false, basic: true, pro: true },
  { feature: "分析・統計", free: false, basic: true, pro: true },
  { feature: "PDCA自動化", free: false, basic: false, pro: true },
  { feature: "API制限 (月)", free: "100", basic: "10,000", pro: "100,000" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [saving, setSaving] = useState(false);
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
      api_tier: map["api_tier"] ?? "free",
      default_genre: map["default_genre"] ?? "",
      default_interval: map["default_interval"] ?? "60",
      auto_follow_enabled: map["auto_follow_enabled"] === "true",
      pdca_auto_apply: map["pdca_auto_apply"] === "true",
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

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-zinc-800 animate-pulse" />
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
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-400" />
            X API設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">API Key</Label>
              <Input
                type="password"
                placeholder="API Keyを入力"
                value={settings.x_api_key}
                onChange={(e) =>
                  setSettings({ ...settings, x_api_key: e.target.value })
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">API Secret</Label>
              <Input
                type="password"
                placeholder="API Secretを入力"
                value={settings.x_api_secret}
                onChange={(e) =>
                  setSettings({ ...settings, x_api_secret: e.target.value })
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Access Token</Label>
              <Input
                type="password"
                placeholder="Access Tokenを入力"
                value={settings.x_access_token}
                onChange={(e) =>
                  setSettings({ ...settings, x_access_token: e.target.value })
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Access Token Secret</Label>
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
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Bearer Token</Label>
            <Input
              type="password"
              placeholder="Bearer Tokenを入力"
              value={settings.x_bearer_token}
              onChange={(e) =>
                setSettings({ ...settings, x_bearer_token: e.target.value })
              }
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
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

          <Separator className="bg-zinc-800" />

          {/* API Tier */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">APIティア</Label>
              <Select
                value={settings.api_tier}
                onValueChange={(v) =>
                  setSettings({ ...settings, api_tier: v })
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem
                    value="free"
                    className="text-zinc-100 focus:bg-zinc-700"
                  >
                    Free
                  </SelectItem>
                  <SelectItem
                    value="basic"
                    className="text-zinc-100 focus:bg-zinc-700"
                  >
                    Basic
                  </SelectItem>
                  <SelectItem
                    value="pro"
                    className="text-zinc-100 focus:bg-zinc-700"
                  >
                    Pro
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tier comparison */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 px-3 text-zinc-500 font-medium">
                      機能
                    </th>
                    <th className="text-center py-2 px-3 text-zinc-500 font-medium">
                      Free
                    </th>
                    <th className="text-center py-2 px-3 text-zinc-500 font-medium">
                      Basic
                    </th>
                    <th className="text-center py-2 px-3 text-zinc-500 font-medium">
                      Pro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tierFeatures.map((item) => (
                    <tr
                      key={item.feature}
                      className="border-b border-zinc-800/50"
                    >
                      <td className="py-2 px-3 text-zinc-300">
                        {item.feature}
                      </td>
                      {(["free", "basic", "pro"] as const).map((tier) => {
                        const val = item[tier];
                        return (
                          <td
                            key={tier}
                            className="text-center py-2 px-3"
                          >
                            {typeof val === "boolean" ? (
                              val ? (
                                <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-zinc-600 mx-auto" />
                              )
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-zinc-700 text-zinc-400"
                              >
                                {val}
                              </Badge>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claude API Configuration */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <Key className="h-5 w-5 text-purple-400" />
            Claude API設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">API Key</Label>
            <Input
              type="password"
              placeholder="Claude API Keyを入力"
              value={settings.claude_api_key}
              onChange={(e) =>
                setSettings({ ...settings, claude_api_key: e.target.value })
              }
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <Sliders className="h-5 w-5 text-zinc-400" />
            一般設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">デフォルトジャンル</Label>
              <Input
                placeholder="例: テクノロジー"
                value={settings.default_genre}
                onChange={(e) =>
                  setSettings({ ...settings, default_genre: e.target.value })
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">
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
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-zinc-300">自動フォロー</Label>
                <p className="text-xs text-zinc-500 mt-0.5">
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
                <Label className="text-zinc-300">PDCA自動適用</Label>
                <p className="text-xs text-zinc-500 mt-0.5">
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
