"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, FileText, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { adminApi } from "@/lib/api-client";
import { truncateText } from "@/lib/utils";
import type { Template, TemplateCreate } from "@/types";

export default function AdminTemplatesPage() {
  const params = useParams();
  const userId = Number(params.id);

  const {
    data: templates,
    loading,
    error,
    refetch,
  } = useApi<Template[]>(useCallback(() => adminApi.templateList(userId), [userId]));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<TemplateCreate>({
    name: "",
    content_pattern: "",
    variables: [],
    category: null,
    is_active: true,
  });
  const [variablesInput, setVariablesInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      content_pattern: "",
      variables: [],
      category: null,
      is_active: true,
    });
    setVariablesInput("");
    setDialogOpen(true);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content_pattern: template.content_pattern,
      variables: template.variables,
      category: template.category,
      is_active: template.is_active,
    });
    setVariablesInput((template.variables ?? []).join(", "));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const vars = variablesInput
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      const data = { ...formData, variables: vars };

      if (editingTemplate) {
        await adminApi.templateUpdate(userId, editingTemplate.id, data);
      } else {
        await adminApi.templateCreate(userId, data);
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
      await adminApi.templateDelete(userId, id);
      refetch();
    } catch {
      // Error handled by API client
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (template: Template) => {
    try {
      await adminApi.templateUpdate(userId, template.id, {
        is_active: !template.is_active,
      });
      refetch();
    } catch {
      // Error handled
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            投稿テンプレートを管理して、効率的にコンテンツを作成しましょう
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          新規テンプレート
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
          テンプレートの取得に失敗しました: {error}
        </div>
      )}

      {/* Template grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : (templates ?? []).length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-10 w-10 text-muted-foreground/60 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground/80 mb-2">
            テンプレートがありません
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            テンプレートを作成して投稿作成を効率化しましょう
          </p>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            最初のテンプレートを作成
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(templates ?? []).map((template) => (
            <Card
              key={template.id}
              className="bg-card border-border hover:border-border transition-colors"
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {template.name}
                    </h3>
                    {template.category && (
                      <Badge
                        variant="outline"
                        className="mt-1 border-border text-muted-foreground text-[10px]"
                      >
                        {template.category}
                      </Badge>
                    )}
                  </div>
                  <Switch
                    checked={template.is_active}
                    onCheckedChange={() => handleToggleActive(template)}
                  />
                </div>

                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {truncateText(template.content_pattern, 120)}
                </p>

                {(template.variables ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((v) => (
                      <Badge
                        key={v}
                        variant="outline"
                        className="border-purple-500/30 text-purple-400 text-[10px]"
                      >
                        {`{${v}}`}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(template)}
                    className="text-muted-foreground hover:text-foreground gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    編集
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    disabled={deleting === template.id}
                    className="text-red-400 hover:text-red-300 gap-1.5"
                  >
                    {deleting === template.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    削除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingTemplate ? "テンプレートを編集" : "新規テンプレート"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground/80">テンプレート名</Label>
              <Input
                placeholder="例: 朝の挨拶"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">コンテンツパターン</Label>
              <Textarea
                placeholder="おはようございます！今日の{topic}について..."
                value={formData.content_pattern}
                onChange={(e) =>
                  setFormData({ ...formData, content_pattern: e.target.value })
                }
                rows={4}
                className="bg-muted border-border text-foreground resize-none"
              />
              <p className="text-xs text-muted-foreground">
                変数は {`{変数名}`} の形式で記述してください
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">変数 (カンマ区切り)</Label>
              <Input
                placeholder="例: topic, mood, greeting"
                value={variablesInput}
                onChange={(e) => setVariablesInput(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/80">カテゴリ</Label>
              <Input
                placeholder="例: 挨拶、お知らせ、コラム"
                value={formData.category ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value || null,
                  })
                }
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label className="text-foreground/80">有効</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-muted-foreground"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving || !formData.name.trim() || !formData.content_pattern.trim()
              }
              className="gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingTemplate ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
