import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { Database, Server, Code, Package, Plus, Play, Edit, Trash2, ChevronRight, ChevronDown, RotateCcw, CheckCircle, AlertCircle, BookmarkPlus } from "lucide-react";
import { Button } from "./ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { usePresetStore } from "../store/presetStore";
import { useExecutionStore } from "../store/executionStore";
import { useCommandStore } from "../store/commandStore";
import type { Preset } from "@shared/types";

const PRESET_ICONS = {
  database: Database,
  server: Server,
  code: Code,
  package: Package,
} as const;

export default function CommandPresets() {
  const location = useLocation();
  const presets = usePresetStore((state) => state.presets);
  const loading = usePresetStore((state) => state.loading);
  const fetchPresets = usePresetStore((state) => state.fetchPresets);
  const savePreset = usePresetStore((state) => state.savePreset);
  const updatePreset = usePresetStore((state) => state.updatePreset);
  const deletePreset = usePresetStore((state) => state.deletePreset);

  const commands = useCommandStore((state) => state.commands);
  const activePresets = useExecutionStore((state) => state.activePresets);
  const startPreset = useExecutionStore((state) => state.startPreset);
  const stopPreset = useExecutionStore((state) => state.stopPreset);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [expandedPresets, setExpandedPresets] = useState<Set<string>>(new Set());
  const [newPreset, setNewPreset] = useState<Omit<Preset, "id" | "createdAt" | "updatedAt">>({
    name: "",
    description: "",
    commands: [],
  });

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  useEffect(() => {
    const state = location.state as { newPresetName?: string } | null;
    if (state?.newPresetName) {
      setNewPreset(prev => ({
        ...prev,
        name: state.newPresetName || "",
      }));
      setShowAddDialog(true);
    }
  }, [location.state]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedPresets);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPresets(newExpanded);
  };

  const handleAddPreset = async () => {
    if (newPreset.name.trim()) {
      const preset: Preset = {
        ...newPreset,
        id: Date.now().toString(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await savePreset(preset);
      setNewPreset({ name: "", description: "", commands: [] });
      setShowAddDialog(false);
    }
  };

  const handleEditPreset = async () => {
    if (editingPreset) {
      await updatePreset(editingPreset.id, editingPreset);
      setEditingPreset(null);
      setShowEditDialog(false);
    }
  };

  const handleDeletePreset = async (id: string) => {
    if (window.confirm("确定要删除这个预设吗？")) {
      await deletePreset(id);
    }
  };

  const handleExecutePreset = async (preset: Preset) => {
    const commandIds = preset.commands.map(cmd => cmd.id);
    await window.electronAPI.executePreset(preset.id, commandIds);
    startPreset(preset.id, commandIds);
    setExpandedPresets(new Set([preset.id]));
  };

  const handleStopPreset = async (id: string) => {
    await window.electronAPI.stopPreset(id);
    stopPreset(id);
  };

  const getPresetStatus = (id: string) => {
    const execution = activePresets.get(id);
    return execution;
  };

  const getStatusIcon = (status: "running" | "completed" | "stopped" | undefined) => {
    if (status === "running") {
      return <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />;
    } else if (status === "completed") {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (status === "stopped") {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
    return null;
  };

  return (
    <div className="h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">命令预设</h2>
            <p className="text-sm text-gray-600 mt-1">快速访问常用命令集合</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            添加预设
          </Button>
        </div>
      </div>

      <div className="p-6" onContextMenu={() => console.log('p-6 context menu')}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="min-h-[500px]" onContextMenu={() => console.log('min-h-[500px] context menu')}>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">加载中...</div>
                </div>
              ) : presets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Package className="w-12 h-12 mb-4 opacity-50" />
                  <p>暂无预设，点击上方按钮或右键创建</p>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                  {presets.map((preset) => {
                    const Icon = PRESET_ICONS[preset.icon as keyof typeof PRESET_ICONS] || Package;
                    const execution = getPresetStatus(preset.id);
                    const isExpanded = expandedPresets.has(preset.id);

                    return (
                      <ContextMenu key={preset.id}>
                        <ContextMenuTrigger asChild>
                          <div
                            className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                            onContextMenu={(e) => e.stopPropagation()}
                          >
                            <div className="p-5">
                              <div className="flex items-start justify-between">
                                <div
                                  className="flex items-start gap-3 flex-1 cursor-pointer"
                                  onClick={() => toggleExpand(preset.id)}
                                >
                                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Icon className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold text-gray-900">{preset.name}</h3>
                                      {getStatusIcon(execution?.completed ? "completed" : execution?.stopRequested ? "stopped" : undefined)}
                                    </div>
                                    {preset.description && (
                                      <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="secondary">
                                        {preset.commands.length} 个命令
                                      </Badge>
                                      {execution && (
                                        <Badge variant="outline">
                                          {execution.currentIndex}/{execution.total}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>

                                <div className="flex gap-1 ml-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingPreset(preset);
                                      setShowEditDialog(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePreset(preset.id);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                  <div className="flex gap-2 mb-3">
                                    {execution?.completed || execution?.stopRequested ? (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleExecutePreset(preset);
                                        }}
                                        className="flex-1"
                                      >
                                        <Play className="w-4 h-4 mr-1" />
                                        重新执行
                                      </Button>
                                    ) : execution && !execution?.completed ? (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStopPreset(preset.id);
                                        }}
                                        className="flex-1 bg-red-600 hover:bg-red-700"
                                      >
                                        <RotateCcw className="w-4 h-4 mr-1" />
                                        停止执行
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleExecutePreset(preset);
                                        }}
                                        className="flex-1"
                                      >
                                        <Play className="w-4 h-4 mr-1" />
                                        执行预设
                                      </Button>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    {preset.commands.map((cmd, index) => (
                                      <div
                                        key={cmd.id}
                                        className={`flex items-center gap-3 p-3 rounded ${
                                          execution && execution.currentIndex > index
                                            ? "bg-green-50 border border-green-200"
                                            : execution && execution.currentIndex === index + 1
                                            ? "bg-blue-50 border border-blue-200"
                                            : "bg-gray-50"
                                        }`}
                                      >
                                        <div className="flex-1">
                                          <code className="text-sm font-mono text-gray-900">
                                            {cmd.content}
                                          </code>
                                          {cmd.description && (
                                            <p className="text-xs text-gray-500 mt-1">{cmd.description}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {execution && execution.currentIndex > index && (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                          )}
                                          {execution && execution.currentIndex === index + 1 && (
                                            <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => handleExecutePreset(preset)}>
                            <Play className="w-4 h-4 mr-2" />
                            执行预设
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => {
                            setEditingPreset(preset);
                            setShowEditDialog(true);
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            编辑预设
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => handleDeletePreset(preset.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除预设
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                </div>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => setShowAddDialog(true)}>
              <BookmarkPlus className="w-4 h-4 mr-2" />
              添加预设
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加预设</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">预设名称</Label>
              <Input
                id="name"
                value={newPreset.name}
                onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                placeholder="例如：开发环境启动"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述（可选）</Label>
              <Textarea
                id="description"
                value={newPreset.description}
                onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
                placeholder="简要描述这个预设的用途"
              />
            </div>
            <div className="space-y-2">
              <Label>选择命令</Label>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                {commands.map((cmd) => (
                  <label key={cmd.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPreset.commands.some((c) => c.id === cmd.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewPreset({
                            ...newPreset,
                            commands: [
                              ...newPreset.commands,
                              { id: cmd.id, content: cmd.content, order: newPreset.commands.length },
                            ],
                          });
                        } else {
                          setNewPreset({
                            ...newPreset,
                            commands: newPreset.commands.filter((c) => c.id !== cmd.id),
                          });
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <code className="text-sm font-mono">{cmd.content}</code>
                      {cmd.description && <p className="text-xs text-gray-500 mt-1">{cmd.description}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddPreset}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑预设</DialogTitle>
          </DialogHeader>
          {editingPreset && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">预设名称</Label>
                <Input
                  id="edit-name"
                  value={editingPreset.name}
                  onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">描述</Label>
                <Textarea
                  id="edit-description"
                  value={editingPreset.description || ""}
                  onChange={(e) => setEditingPreset({ ...editingPreset, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEditPreset}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
