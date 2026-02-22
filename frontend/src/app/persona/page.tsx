"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  User,
  Loader2,
  Pencil,
  Trash2,
  Star,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { personaApi } from "@/lib/api-client";
import type { Persona, PersonaCreate } from "@/types";

const COMMUNICATION_STYLES = [
  { value: "casual", label: "カジュアル" },
  { value: "professional", label: "プロフェッショナル" },
  { value: "academic", label: "アカデミック" },
  { value: "humorous", label: "ユーモラス" },
  { value: "inspirational", label: "インスピレーショナル" },
];

const TONES = [
  { value: "friendly", label: "フレンドリー" },
  { value: "authoritative", label: "権威的" },
  { value: "conversational", label: "会話的" },
  { value: "provocative", label: "挑発的" },
  { value: "educational", label: "教育的" },
];

interface PersonaFormData {
  name: string;
  description: string;
  personality_traits: string;
  background_story: string;
  target_audience: string;
  expertise_areas: string;
  communication_style: string;
  tone: string;
  language_patterns: string;
  example_posts: string;
}

const emptyFormData: PersonaFormData = {
  name: "",
  description: "",
  personality_traits: "",
  background_story: "",
  target_audience: "",
  expertise_areas: "",
  communication_style: "casual",
  tone: "friendly",
  language_patterns: "",
  example_posts: "",
};

function personaToFormData(persona: Persona): PersonaFormData {
  return {
    name: persona.name,
    description: persona.description ?? "",
    personality_traits: (persona.personality_traits ?? []).join(", "),
    background_story: persona.background_story ?? "",
    target_audience: persona.target_audience ?? "",
    expertise_areas: (persona.expertise_areas ?? []).join(", "),
    communication_style: persona.communication_style ?? "casual",
    tone: persona.tone ?? "friendly",
    language_patterns: (persona.language_patterns ?? []).join(", "),
    example_posts: (persona.example_posts ?? []).join("\n"),
  };
}

function formDataToPayload(formData: PersonaFormData): PersonaCreate {
  return {
    name: formData.name,
    description: formData.description || undefined,
    personality_traits: formData.personality_traits
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    background_story: formData.background_story || undefined,
    target_audience: formData.target_audience || undefined,
    expertise_areas: formData.expertise_areas
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    communication_style: formData.communication_style || undefined,
    tone: formData.tone || undefined,
    language_patterns: formData.language_patterns
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    example_posts: formData.example_posts
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

function getStyleLabel(value: string | null | undefined): string {
  const found = COMMUNICATION_STYLES.find((s) => s.value === value);
  return found ? found.label : value ?? "-";
}

function getToneLabel(value: string | null | undefined): string {
  const found = TONES.find((t) => t.value === value);
  return found ? found.label : value ?? "-";
}

export default function PersonaPage() {
  const {
    data: personas,
    loading,
    error,
    refetch,
  } = useApi<Persona[]>(useCallback(() => personaApi.list(), []));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [formData, setFormData] = useState<PersonaFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [activating, setActivating] = useState<number | null>(null);

  const activePersona = (personas ?? []).find((p) => p.is_active);
  const inactivePersonas = (personas ?? []).filter((p) => !p.is_active);

  const openCreateDialog = () => {
    setEditingPersona(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (persona: Persona) => {
    setEditingPersona(persona);
    setFormData(personaToFormData(persona));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = formDataToPayload(formData);
      if (editingPersona) {
        await personaApi.update(editingPersona.id, payload);
      } else {
        await personaApi.create(payload);
      }
      setDialogOpen(false);
      refetch();
    } catch {
      // Error handled by API client
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await personaApi.delete(id);
      refetch();
    } catch {
      // Error handled by API client
    } finally {
      setDeleting(null);
    }
  };

  const handleActivate = async (id: number) => {
    setActivating(id);
    try {
      await personaApi.activate(id);
      refetch();
    } catch {
      // Error handled by API client
    } finally {
      setActivating(null);
    }
  };

  const updateField = (field: keyof PersonaFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Shared card renderer
  const renderPersonaCard = (persona: Persona, isActive: boolean) => (
    <Card
      key={persona.id}
      className={`bg-zinc-900 transition-colors ${
        isActive
          ? "border-blue-500 border-2"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-100 truncate">
                {persona.name}
              </h3>
              {isActive && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                  <Star className="h-3 w-3 mr-0.5" />
                  Active
                </Badge>
              )}
            </div>
            {persona.description && (
              <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                {persona.description}
              </p>
            )}
          </div>
        </div>

        {/* Personality traits */}
        {(persona.personality_traits ?? []).length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 font-medium">
              パーソナリティ
            </p>
            <div className="flex flex-wrap gap-1">
              {persona.personality_traits.map((trait) => (
                <Badge
                  key={trait}
                  variant="outline"
                  className="border-purple-500/30 text-purple-400 text-[10px]"
                >
                  {trait}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Target audience */}
        {persona.target_audience && (
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 font-medium">
              ターゲット
            </p>
            <p className="text-sm text-zinc-300">{persona.target_audience}</p>
          </div>
        )}

        {/* Communication style & tone */}
        <div className="flex items-center gap-3">
          {persona.communication_style && (
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 text-[10px]"
            >
              {getStyleLabel(persona.communication_style)}
            </Badge>
          )}
          {persona.tone && (
            <Badge
              variant="outline"
              className="border-amber-500/30 text-amber-400 text-[10px]"
            >
              {getToneLabel(persona.tone)}
            </Badge>
          )}
        </div>

        {/* Expertise areas */}
        {(persona.expertise_areas ?? []).length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 font-medium">専門分野</p>
            <div className="flex flex-wrap gap-1">
              {persona.expertise_areas.map((area) => (
                <Badge
                  key={area}
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-400 text-[10px]"
                >
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
          {!isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleActivate(persona.id)}
              disabled={activating === persona.id}
              className="text-blue-400 hover:text-blue-300 gap-1.5"
            >
              {activating === persona.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              有効化
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(persona)}
            className="text-zinc-400 hover:text-zinc-100 gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            編集
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(persona.id)}
            disabled={deleting === persona.id}
            className="text-red-400 hover:text-red-300 gap-1.5"
          >
            {deleting === persona.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            削除
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">ペルソナ管理</h1>
          <p className="text-sm text-zinc-400 mt-1">
            投稿に使用するペルソナを管理します。有効なペルソナがAI生成時に適用されます。
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          新規ペルソナ
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
          ペルソナの取得に失敗しました: {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-48 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-lg bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : (personas ?? []).length === 0 ? (
        /* Empty state */
        <div className="text-center py-16">
          <User className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">
            ペルソナがありません
          </h3>
          <p className="text-sm text-zinc-500 mb-6">
            ペルソナを作成して、AI生成の投稿に個性を持たせましょう
          </p>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            最初のペルソナを作成
          </Button>
        </div>
      ) : (
        <>
          {/* Active persona */}
          {activePersona && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                有効なペルソナ
              </h2>
              {renderPersonaCard(activePersona, true)}
            </div>
          )}

          {/* All other personas */}
          {inactivePersonas.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                その他のペルソナ
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactivePersonas.map((persona) =>
                  renderPersonaCard(persona, false)
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {editingPersona ? "ペルソナを編集" : "新規ペルソナ"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-zinc-300">ペルソナ名</Label>
              <Input
                placeholder="例: テック系インフルエンサー"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-zinc-300">説明</Label>
              <Textarea
                placeholder="このペルソナの概要を記述してください"
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={2}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
              />
            </div>

            {/* Personality traits */}
            <div className="space-y-2">
              <Label className="text-zinc-300">
                パーソナリティ特性 (カンマ区切り)
              </Label>
              <Input
                placeholder="例: 知的好奇心旺盛, ポジティブ, 分析的"
                value={formData.personality_traits}
                onChange={(e) =>
                  updateField("personality_traits", e.target.value)
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
              {formData.personality_traits && (
                <div className="flex flex-wrap gap-1">
                  {formData.personality_traits
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((trait) => (
                      <Badge
                        key={trait}
                        variant="outline"
                        className="border-purple-500/30 text-purple-400 text-[10px]"
                      >
                        {trait}
                      </Badge>
                    ))}
                </div>
              )}
            </div>

            {/* Background story */}
            <div className="space-y-2">
              <Label className="text-zinc-300">バックグラウンドストーリー</Label>
              <Textarea
                placeholder="このペルソナの背景や経歴を記述してください"
                value={formData.background_story}
                onChange={(e) =>
                  updateField("background_story", e.target.value)
                }
                rows={3}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
              />
            </div>

            {/* Target audience */}
            <div className="space-y-2">
              <Label className="text-zinc-300">ターゲットオーディエンス</Label>
              <Input
                placeholder="例: 20-30代のエンジニア"
                value={formData.target_audience}
                onChange={(e) =>
                  updateField("target_audience", e.target.value)
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            {/* Expertise areas */}
            <div className="space-y-2">
              <Label className="text-zinc-300">
                専門分野 (カンマ区切り)
              </Label>
              <Input
                placeholder="例: AI, Web開発, スタートアップ"
                value={formData.expertise_areas}
                onChange={(e) =>
                  updateField("expertise_areas", e.target.value)
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
              {formData.expertise_areas && (
                <div className="flex flex-wrap gap-1">
                  {formData.expertise_areas
                    .split(",")
                    .map((a) => a.trim())
                    .filter(Boolean)
                    .map((area) => (
                      <Badge
                        key={area}
                        variant="outline"
                        className="border-cyan-500/30 text-cyan-400 text-[10px]"
                      >
                        {area}
                      </Badge>
                    ))}
                </div>
              )}
            </div>

            {/* Communication style & Tone row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Communication style */}
              <div className="space-y-2">
                <Label className="text-zinc-300">
                  コミュニケーションスタイル
                </Label>
                <Select
                  value={formData.communication_style}
                  onValueChange={(value) =>
                    updateField("communication_style", value)
                  }
                >
                  <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-zinc-100">
                    <SelectValue placeholder="スタイルを選択" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {COMMUNICATION_STYLES.map((style) => (
                      <SelectItem
                        key={style.value}
                        value={style.value}
                        className="text-zinc-100 focus:bg-zinc-700 focus:text-zinc-100"
                      >
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tone */}
              <div className="space-y-2">
                <Label className="text-zinc-300">トーン</Label>
                <Select
                  value={formData.tone}
                  onValueChange={(value) => updateField("tone", value)}
                >
                  <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-zinc-100">
                    <SelectValue placeholder="トーンを選択" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {TONES.map((tone) => (
                      <SelectItem
                        key={tone.value}
                        value={tone.value}
                        className="text-zinc-100 focus:bg-zinc-700 focus:text-zinc-100"
                      >
                        {tone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Language patterns */}
            <div className="space-y-2">
              <Label className="text-zinc-300">
                言語パターン (カンマ区切り)
              </Label>
              <Input
                placeholder="例: 〜だよね, ちなみに, 実は"
                value={formData.language_patterns}
                onChange={(e) =>
                  updateField("language_patterns", e.target.value)
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            {/* Example posts */}
            <div className="space-y-2">
              <Label className="text-zinc-300">
                投稿例 (1行につき1投稿)
              </Label>
              <Textarea
                placeholder={
                  "例:\n今日もAIの進化が止まらない！特に...\nスタートアップで学んだ3つのこと..."
                }
                value={formData.example_posts}
                onChange={(e) => updateField("example_posts", e.target.value)}
                rows={4}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-zinc-400"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingPersona ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
