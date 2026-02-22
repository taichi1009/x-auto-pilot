"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Calendar,
  Clock,
  Repeat,
  Loader2,
  Pencil,
  Trash2,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { schedulesApi } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { Schedule, ScheduleCreate } from "@/types";

export default function SchedulePage() {
  const {
    data: schedules,
    loading,
    error,
    refetch,
  } = useApi<Schedule[]>(useCallback(() => schedulesApi.list(), []));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState<ScheduleCreate>({
    name: "",
    schedule_type: "once",
    cron_expression: null,
    scheduled_at: null,
    is_active: true,
    post_type: "ai_generated",
    ai_prompt: null,
    template_id: null,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const openCreateDialog = () => {
    setEditingSchedule(null);
    setFormData({
      name: "",
      schedule_type: "once",
      cron_expression: null,
      scheduled_at: null,
      is_active: true,
      post_type: "ai_generated",
      ai_prompt: null,
      template_id: null,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      schedule_type: schedule.schedule_type,
      cron_expression: schedule.cron_expression,
      scheduled_at: schedule.scheduled_at,
      is_active: schedule.is_active,
      post_type: schedule.post_type,
      ai_prompt: schedule.ai_prompt,
      template_id: schedule.template_id,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingSchedule) {
        await schedulesApi.update(editingSchedule.id, formData);
      } else {
        await schedulesApi.create(formData);
      }
      setDialogOpen(false);
      refetch();
    } catch {
      // Error handled
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await schedulesApi.delete(id);
      refetch();
    } catch {
      // Error handled
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await schedulesApi.toggle(id);
      refetch();
    } catch {
      // Error handled
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          投稿スケジュールを管理して、自動投稿を設定しましょう
        </p>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          新規スケジュール
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
          スケジュールの取得に失敗しました: {error}
        </div>
      )}

      {/* Schedules list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-zinc-800 animate-pulse"
            />
          ))}
        </div>
      ) : (schedules ?? []).length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">
            スケジュールがありません
          </h3>
          <p className="text-sm text-zinc-500 mb-6">
            自動投稿スケジュールを作成しましょう
          </p>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            最初のスケジュールを作成
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {(schedules ?? []).map((schedule) => (
            <Card
              key={schedule.id}
              className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-zinc-100">
                        {schedule.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={
                          schedule.is_active
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                        }
                      >
                        {schedule.is_active ? "有効" : "無効"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-zinc-700 text-zinc-400"
                      >
                        {schedule.schedule_type === "once" ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            一回
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Repeat className="h-3 w-3" />
                            繰り返し
                          </span>
                        )}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      {schedule.scheduled_at && (
                        <span>
                          予定: {formatDate(schedule.scheduled_at)}
                        </span>
                      )}
                      {schedule.cron_expression && (
                        <span>Cron: {schedule.cron_expression}</span>
                      )}
                      <span>投稿タイプ: {schedule.post_type}</span>
                    </div>

                    {schedule.ai_prompt && (
                      <p className="text-sm text-zinc-400">
                        プロンプト: {schedule.ai_prompt}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggle(schedule.id)}
                      className="text-zinc-400 hover:text-zinc-100 h-8 w-8"
                      title={schedule.is_active ? "無効化" : "有効化"}
                    >
                      {schedule.is_active ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(schedule)}
                      className="text-zinc-400 hover:text-zinc-100 h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(schedule.id)}
                      disabled={deleting === schedule.id}
                      className="text-red-400 hover:text-red-300 h-8 w-8"
                    >
                      {deleting === schedule.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming timeline */}
      {(schedules ?? []).filter((s) => s.is_active && s.scheduled_at).length >
        0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-base">
              今後の予定
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(schedules ?? [])
                .filter((s) => s.is_active && s.scheduled_at)
                .sort(
                  (a, b) =>
                    new Date(a.scheduled_at!).getTime() -
                    new Date(b.scheduled_at!).getTime()
                )
                .map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center gap-4 pl-4 border-l-2 border-blue-500/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-100">
                        {schedule.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(schedule.scheduled_at!)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {editingSchedule ? "スケジュールを編集" : "新規スケジュール"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">スケジュール名</Label>
              <Input
                placeholder="例: 朝の自動投稿"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">スケジュールタイプ</Label>
              <Select
                value={formData.schedule_type}
                onValueChange={(v) =>
                  setFormData({ ...formData, schedule_type: v })
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem
                    value="once"
                    className="text-zinc-100 focus:bg-zinc-700"
                  >
                    一回のみ
                  </SelectItem>
                  <SelectItem
                    value="recurring"
                    className="text-zinc-100 focus:bg-zinc-700"
                  >
                    繰り返し
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.schedule_type === "once" ? (
              <div className="space-y-2">
                <Label className="text-zinc-300">予定日時</Label>
                <Input
                  type="datetime-local"
                  value={
                    formData.scheduled_at
                      ? new Date(formData.scheduled_at)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduled_at: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-zinc-300">Cron式</Label>
                <Input
                  placeholder="例: 0 9 * * * (毎日9:00)"
                  value={formData.cron_expression ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cron_expression: e.target.value || null,
                    })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
                <p className="text-xs text-zinc-500">
                  分 時 日 月 曜日 の形式で入力
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-zinc-300">投稿タイプ</Label>
              <Select
                value={formData.post_type}
                onValueChange={(v) =>
                  setFormData({ ...formData, post_type: v })
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem
                    value="original"
                    className="text-zinc-100 focus:bg-zinc-700"
                  >
                    オリジナル
                  </SelectItem>
                  <SelectItem
                    value="ai_generated"
                    className="text-zinc-100 focus:bg-zinc-700"
                  >
                    AI生成
                  </SelectItem>
                  <SelectItem
                    value="template"
                    className="text-zinc-100 focus:bg-zinc-700"
                  >
                    テンプレート
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.post_type === "ai_generated" && (
              <div className="space-y-2">
                <Label className="text-zinc-300">AIプロンプト</Label>
                <Textarea
                  placeholder="AIに生成させたい投稿の指示を入力..."
                  value={formData.ai_prompt ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ai_prompt: e.target.value || null,
                    })
                  }
                  rows={3}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label className="text-zinc-300">有効</Label>
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
              {editingSchedule ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
