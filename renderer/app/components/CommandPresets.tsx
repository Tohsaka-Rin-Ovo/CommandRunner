import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { Database, Server, Code, Package, Plus, Play, Edit, Trash2, ChevronRight, ChevronDown, RotateCcw, CheckCircle, AlertCircle, BookmarkPlus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "./ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [expandedPresets, setExpandedPresets] = useState<Set<string>>(new Set());
  const [newPreset, setNewPreset] = useState<Omit<Preset, "id" | "createdAt" | "updatedAt">>({
    name: "",
    description: "",
    commands: [],
    order: 0,
  });
  const { sortBy, sortOrder, useDefaultSort } = usePresetStore((state) => state.sortConfig);
  const setSortConfig = usePresetStore((state) => state.setSortConfig);
  const draggingSource = usePresetStore((state) => state.draggingSource);
  const setDraggingSource = usePresetStore((state) => state.setDraggingSource);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

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
      setNewPreset({ name: "", description: "", commands: [], order: 0 });
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

  const handleDeletePreset = (id: string) => {
    setPresetToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDeletePreset = async () => {
    if (!presetToDelete) return;

    console.log('[CommandPresets] 开始删除预设:', presetToDelete);

    try {
      const success = await deletePreset(presetToDelete);
      console.log('[CommandPresets] 删除结果:', success);

      if (success) {
        console.log('[CommandPresets] 删除成功');
        toast.success("预设删除成功");
      } else {
        console.error('[CommandPresets] 删除失败：API 返回 false');
        toast.error("预设删除失败，请查看控制台获取详细信息");
      }
    } catch (error) {
      console.error('[CommandPresets] 删除异常:', error);
      toast.error("删除预设失败：" + (error as Error).message);
    } finally {
      setShowDeleteDialog(false);
      setPresetToDelete(null);
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

  const sortedPresets = [...presets].sort((a, b) => {
    if (useDefaultSort) {
      return (a.order || 0) - (b.order || 0);
    }

    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'createdAt') {
      comparison = a.createdAt - b.createdAt;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSortBy = (value: 'name' | 'createdAt') => {
    setSortConfig({ sortBy: value });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!useDefaultSort) return;
    setIsDragging(true);
    setDraggingId(id);
    setDraggingSource('grid');
    e.dataTransfer.setData('source', 'grid');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    if (!useDefaultSort || draggingSource !== 'grid') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggingId === targetId) {
      setDragOverId(null);
      setDropPosition(null);
      return;
    }

    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const mouseX = e.clientX;
    const threshold = rect.left + rect.width / 2;

    setDragOverId(targetId);
    if (mouseX < threshold) {
      setDropPosition('before');
    } else {
      setDropPosition('after');
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
    setDropPosition(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    if (!useDefaultSort || draggingSource !== 'grid') return;
    e.preventDefault();
    setIsDragging(false);
    setDragOverId(null);
    setDropPosition(null);

    if (!draggingId || draggingId === targetId) return;

    const newSortedPresets = [...sortedPresets];
    const fromIndex = newSortedPresets.findIndex(p => p.id === draggingId);
    const toIndex = newSortedPresets.findIndex(p => p.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const [removed] = newSortedPresets.splice(fromIndex, 1);
      // 根据 dropPosition 调整插入位置
      // 如果是从上往下拖，且插入到目标下方，toIndex 不变（因为移除了上面的，下面的索引减1，但我们想要插在原来toIndex的后面，即现在的toIndex位置）
      // 这里的逻辑有点绕，最简单的是：先移除，再计算目标的新索引，再插入
      
      // 重新计算目标索引（因为数组变了）
      let finalToIndex = newSortedPresets.findIndex(p => p.id === targetId);
      if (dropPosition === 'after') {
        finalToIndex++;
      }

      newSortedPresets.splice(finalToIndex, 0, removed);

      const reorderedPresets = newSortedPresets.map((preset, index) => ({
        ...preset,
        order: index
      }));
      
      console.log('[handleDrop] Reordered presets order:', reorderedPresets.map(p => ({ id: p.id, name: p.name, order: p.order })));

      // 使用 reorderPresets 批量更新并立即生效
      const success = await usePresetStore.getState().reorderPresets(reorderedPresets);
      if (success) {
        toast.success('排序已保存');
      } else {
        toast.error('排序保存失败');
      }
    }

    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggingId(null);
    setDraggingSource(null);
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="default-sort" className="text-sm text-gray-600">默认设置</Label>
              <Switch
                id="default-sort"
                checked={useDefaultSort}
                onCheckedChange={(checked) => setSortConfig({ useDefaultSort: checked })}
              />
            </div>
            <div className={`flex items-center gap-1 bg-white border border-gray-200 rounded-md p-1 transition-opacity duration-200 ${useDefaultSort ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <DropdownMenu onOpenChange={setIsSortDropdownOpen}>
                <DropdownMenuTrigger asChild disabled={useDefaultSort}>
                  <Button variant="ghost" size="sm" className={`h-8 gap-1 px-2 font-normal ${useDefaultSort ? 'cursor-not-allowed' : ''}`} disabled={useDefaultSort}>
                    <span className="text-sm">{sortBy === 'name' ? '按名称排序' : '按时间排序'}</span>
                    <ChevronDown 
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : ''}`} 
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleSortBy('name')}>
                      按名称排序
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSortBy('createdAt')}>
                      按时间排序
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-8 w-8 ${useDefaultSort ? 'cursor-not-allowed' : ''}`}
                onClick={() => setSortConfig({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' })}
                title={sortOrder === 'asc' ? '切换为降序' : '切换为升序'}
                disabled={useDefaultSort}
              >
                {sortOrder === 'asc' ? (
                  <ArrowUp className="w-3.5 h-3.5 text-gray-500" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5 text-gray-500" />
                )}
              </Button>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              添加预设
            </Button>
          </div>
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
              ) : sortedPresets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Package className="w-12 h-12 mb-4 opacity-50" />
                  <p>暂无预设，点击上方按钮或右键创建</p>
                </div>
              ) : (
                <div 
                  className={`max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-200 ${draggingSource === 'grid' ? 'ring-2 ring-blue-500 ring-opacity-50 rounded-lg p-2 bg-blue-50/30' : ''}`}
                >
                  {sortedPresets.map((preset, index) => {
                    const Icon = PRESET_ICONS[preset.icon as keyof typeof PRESET_ICONS] || Package;
                    const execution = getPresetStatus(preset.id);
                    const isExpanded = expandedPresets.has(preset.id);

                    return (
                      <ContextMenu key={preset.id}>
                         <ContextMenuTrigger asChild>
                           <div
                             draggable={useDefaultSort}
                             className={`bg-white rounded-lg border relative transition-all duration-200
                               ${isDragging && draggingId === preset.id ? 'opacity-50 border-dashed border-gray-300' : 'border-gray-200 hover:shadow-md'}
                               ${useDefaultSort ? 'cursor-move' : ''}
                               ${dragOverId === preset.id && dropPosition === 'before' ? 'border-l-[6px] border-l-blue-500 pl-1' : ''}
                               ${dragOverId === preset.id && dropPosition === 'after' ? 'border-r-[6px] border-r-blue-500 pr-1' : ''}
                             `}
                             onDragStart={(e) => handleDragStart(e, preset.id)}
                             onDragEnd={handleDragEnd}
                             onDragOver={(e) => handleDragOver(e, preset.id)}
                             onDragLeave={handleDragLeave}
                             onDrop={(e) => handleDrop(e, preset.id)}
                             onContextMenu={(e) => e.stopPropagation()}
                           >
                            <div className={`p-5 ${isDragging ? 'pointer-events-none' : ''}`}>
                              <div className="flex items-center justify-between gap-4">
                                <div
                                  className="flex items-start gap-3 flex-1 cursor-pointer min-w-0"
                                  onClick={() => toggleExpand(preset.id)}
                                >
                                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                    <Icon className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold text-gray-900 truncate">{preset.name}</h3>
                                      {getStatusIcon(execution?.completed ? "completed" : execution?.stopRequested ? "stopped" : undefined)}
                                    </div>
                                    {preset.description && (
                                      <p className="text-sm text-gray-600 mt-1 truncate">{preset.description}</p>
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
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <div 
                                    className="cursor-pointer p-1 rounded hover:bg-gray-100 mr-1"
                                    onClick={() => toggleExpand(preset.id)}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-5 h-5 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="w-5 h-5 text-gray-400" />
                                    )}
                                  </div>
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
                               { id: cmd.id, content: cmd.content, description: cmd.description, details: cmd.details, order: newPreset.commands.length },
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
                  onChange={(e) => setEditingPreset(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">描述</Label>
                <Textarea
                  id="edit-description"
                  value={editingPreset.description || ""}
                  onChange={(e) => setEditingPreset(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
               <div className="space-y-2">
                 <Label>选择命令</Label>
                 <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                   {commands.map((cmd) => (
                     <label key={cmd.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingPreset.commands.some((c) => c.id === cmd.id)}
                          onChange={(e) => {
                            setEditingPreset(prev => {
                              if (!prev) return prev;

                              if (e.target.checked) {
                                return {
                                  ...prev,
                                  commands: [
                                    ...prev.commands,
                                    { id: cmd.id, content: cmd.content, description: cmd.description, details: cmd.details, order: prev.commands.length },
                                  ],
                                };
                              } else {
                                return {
                                  ...prev,
                                  commands: prev.commands.filter((c) => c.id !== cmd.id),
                                };
                              }
                            });
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
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEditPreset}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除这个预设吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除该预设配置。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPresetToDelete(null)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePreset} className="bg-red-600 hover:bg-red-700 text-white">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
