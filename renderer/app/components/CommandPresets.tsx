import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { Database, Server, Code, Package, Plus, Play, Edit, Trash2, ChevronRight, ChevronDown, RotateCcw, CheckCircle, AlertCircle, BookmarkPlus, ArrowUpDown, ArrowUp, ArrowDown, Search, Save } from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { toast } from "sonner";
import { usePresetStore } from "../store/presetStore";
import { useExecutionStore } from "../store/executionStore";
import { useCommandStore } from "../store/commandStore";
import type { Preset } from "@shared/types";
import { SelectedCommandsFloating } from "./SelectedCommandsFloating";
import { handleInputFocus } from "../utils/focusUtils";

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
  const [draftPreset, setDraftPreset] = useState<Omit<Preset, "id" | "createdAt" | "updatedAt"> | null>(null);
  const [showDraftConfirmDialog, setShowDraftConfirmDialog] = useState(false);


  const [addDialogSearchQuery, setAddDialogSearchQuery] = useState('');
  const [addDialogSelectedCommand, setAddDialogSelectedCommand] = useState<any>(null);
  const [addDialogNewCommand, setAddDialogNewCommand] = useState({ content: '', description: '', details: '' });
  const [editDialogSearchQuery, setEditDialogSearchQuery] = useState('');
  const [editDialogSelectedCommand, setEditDialogSelectedCommand] = useState<any>(null);
  const [editDialogNewCommand, setEditDialogNewCommand] = useState({ content: '', description: '', details: '' });
  const { sortBy, sortOrder, useDefaultSort } = usePresetStore((state) => state.sortConfig);
  const setSortConfig = usePresetStore((state) => state.setSortConfig);
  const draggingSource = usePresetStore((state) => state.draggingSource);
  const setDraggingSource = usePresetStore((state) => state.setDraggingSource);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [terminalMode, setTerminalMode] = useState<'internal' | 'external'>('external');
  const itemsPerPage = 8;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleScrollRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);
  
  useEffect(() => {
    const loadTerminalMode = async () => {
      try {
        if (window.electronAPI?.getGlobalSettings) {
          const settings = await window.electronAPI.getGlobalSettings()
          setTerminalMode(settings?.terminalMode || 'internal')
        }
      } catch (error) {
        console.error('Failed to load terminal mode:', error)
      }
    }
    loadTerminalMode()
  }, [])
  
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    const handleScroll = () => {
      scrollContainer.classList.add("scrolling");
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        scrollContainer.classList.remove("scrolling");
      }, 1000);
    };
    handleScrollRef.current = handleScroll;
    scrollContainer.addEventListener("scroll", handleScroll);
    return () => {
      const scrollContainer = scrollContainerRef.current;
      const handleScroll = handleScrollRef.current;
      if (scrollContainer && handleScroll) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

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
    if (!newPreset.name || !newPreset.name.trim()) {
      toast.error("预设名称不能为空");
      return;
    }

    const preset: Preset = {
      ...newPreset,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await savePreset(preset);
    setNewPreset({ name: "", description: "", commands: [], order: 0 });
    setDraftPreset(null); // Clear draft after successful creation
    setShowAddDialog(false);
    setCurrentPage(1);
  };

  const handleCloseAddDialog = () => {
    if (newPreset.name.trim() || newPreset.commands.length > 0 || newPreset.description?.trim()) {
      setShowDraftConfirmDialog(true);
    } else {
      setShowAddDialog(false);
      setAddDialogSearchQuery('');
      setAddDialogSelectedCommand(null);
      setAddDialogNewCommand({ content: '', description: '', details: '' });
    }
  };

  const confirmSaveDraft = () => {
    setDraftPreset(newPreset);
    setShowDraftConfirmDialog(false);
    setShowAddDialog(false);
    toast.success("草稿已保存");
  };

  const discardDraft = () => {
    setNewPreset({ name: "", description: "", commands: [], order: 0 });
    setDraftPreset(null);
    setShowDraftConfirmDialog(false);
    setShowAddDialog(false);
    setAddDialogSearchQuery('');
    setAddDialogSelectedCommand(null);
    setAddDialogNewCommand({ content: '', description: '', details: '' });
  };

  const handleOpenAddDialog = () => {
    if (draftPreset) {
      setNewPreset(draftPreset);
    }
    setShowAddDialog(true);
  };


  const handleEditPreset = async () => {
    if (!editingPreset) return;

    if (!editingPreset.name || !editingPreset.name.trim()) {
      toast.error("预设名称不能为空");
      return;
    }

    await updatePreset(editingPreset.id, editingPreset);
    setEditingPreset(null);
    setShowEditDialog(false);
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

        const totalAfterDelete = sortedPresets.length - 1;
        const newTotalPages = Math.ceil(totalAfterDelete / itemsPerPage);
        if (currentPage > newTotalPages && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
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
    if (preset.commands.length === 0) {
      toast.error('当前预设不存在命令，请添加预设');
      return;
    }
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

  const totalPages = Math.ceil(sortedPresets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPresets = sortedPresets.slice(startIndex, endIndex);

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
    
    const fromIndex = currentPresets.findIndex(p => p.id === draggingId);
    const toIndex = currentPresets.findIndex(p => p.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const globalFromIndex = (currentPage - 1) * itemsPerPage + fromIndex;
      const globalToIndex = (currentPage - 1) * itemsPerPage + toIndex;

      const [removed] = newSortedPresets.splice(globalFromIndex, 1);
      
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
    <div className="h-full flex flex-col bg-gray-50">
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
            <Button onClick={handleOpenAddDialog}>
              <Plus className="w-4 h-4 mr-1" />
              添加预设
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 custom-scrollbar" ref={scrollContainerRef} onContextMenu={() => console.log('p-6 context menu')}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div>
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
                  {currentPresets.map((preset, index) => {
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
                                      <Tooltip>
                                        <TooltipTrigger asChild>
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
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-gray-900 text-white border border-gray-700 shadow-lg">
                                          <div className="max-w-xs">
                                            <div className="font-medium mb-1">
                                              {terminalMode === 'external' ? '📢 独立终端窗口模式' : '💻 应用内运行模式'}
                                            </div>
                                            <div className="text-xs text-gray-300">
                                              {terminalMode === 'external' 
                                                ? '预设将在独立终端窗口中执行，窗口弹出即代表完成'
                                                : '预设将在应用内部执行，可以实时查看输出'}
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : execution && !execution?.completed ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
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
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-gray-900 text-white border border-gray-700 shadow-lg">
                                          <div className="max-w-xs">
                                            <div className="font-medium mb-1">
                                              停止预设执行
                                            </div>
                                            <div className="text-xs text-gray-300">
                                              立即停止正在执行的预设
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
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
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-gray-900 text-white border border-gray-700 shadow-lg">
                                          <div className="max-w-xs">
                                            <div className="font-medium mb-1">
                                              {terminalMode === 'external' ? '📢 独立终端窗口模式' : '💻 应用内运行模式'}
                                            </div>
                                            <div className="text-xs text-gray-300">
                                              {terminalMode === 'external' 
                                                ? '预设将在独立终端窗口中执行，窗口弹出即代表完成'
                                                : '预设将在应用内部执行，可以实时查看输出'}
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
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
            <ContextMenuItem onClick={handleOpenAddDialog}>
              <BookmarkPlus className="w-4 h-4 mr-2" />
              添加预设
            </ContextMenuItem>
           </ContextMenuContent>
         </ContextMenu>

         {totalPages > 1 && (
           <div className="mt-6 flex justify-center">
             <Pagination>
               <PaginationContent>
                 <PaginationItem>
                   <PaginationPrevious
                     onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                     className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                   />
                 </PaginationItem>
                 {[...Array(totalPages)].map((_, index) => {
                   const pageNumber = index + 1;
                   if (
                     pageNumber === 1 ||
                     pageNumber === totalPages ||
                     (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                   ) {
                     return (
                       <PaginationItem key={pageNumber}>
                         <PaginationLink
                           onClick={() => setCurrentPage(pageNumber)}
                           isActive={currentPage === pageNumber}
                           className="cursor-pointer"
                         >
                           {pageNumber}
                         </PaginationLink>
                       </PaginationItem>
                     );
                   } else if (
                     pageNumber === currentPage - 2 ||
                     pageNumber === currentPage + 2
                   ) {
                     return (
                       <PaginationItem key={pageNumber}>
                         <PaginationEllipsis />
                       </PaginationItem>
                     );
                   }
                   return null;
                 })}
                 <PaginationItem>
                   <PaginationNext
                     onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                     className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                   />
                 </PaginationItem>
               </PaginationContent>
             </Pagination>
           </div>
         )}
       </div>

      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) {
          handleCloseAddDialog();
        } else {
          handleOpenAddDialog();
        }
      }}>
        <DialogContent 
          className="max-w-4xl max-h-[80vh] flex flex-col overflow-hidden p-0 gap-0"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <Package className="w-4.5 h-4.5" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  添加预设
                  {draftPreset && <Badge variant="secondary" className="text-xs font-normal">草稿</Badge>}
                </span>
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
            <div className="space-y-3.5">
                <div className="rounded-2xl border border-gray-200 bg-white p-4.5 shadow-sm">
                  <div className="mb-3.5 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">基础信息</h3>
                      <p className="mt-1 text-xs text-gray-500">先给这个预设起一个清晰名字，再补充说明。</p>
                    </div>
                    <Badge variant="outline" className="text-xs">步骤 1</Badge>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="mb-2">预设名称</Label>
                      <Input
                        id="name"
                        value={newPreset.name}
                        onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                        placeholder="例如：开发环境启动"
                        autoFocus={false}
                        onFocus={handleInputFocus}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="mb-2">描述（可选）</Label>
                      <Textarea
                        id="description"
                        value={newPreset.description || ''}
                        onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
                        placeholder="简要描述这个预设的用途"
                        onFocus={handleInputFocus}
                        className="min-h-[88px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4.5 shadow-sm">
                  <div className="mb-3.5 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">命令组成</h3>
                      <p className="mt-1 text-xs text-gray-500">从命令库勾选，或者现场输入新的命令。</p>
                    </div>
                    <Badge variant="outline" className="text-xs">步骤 2</Badge>
                  </div>

                  <Tabs defaultValue="library" className="w-full">
                 {/* Tab 切换器 */}
                <TabsList className="grid w-full grid-cols-2 h-10 bg-gray-100 p-0.75 rounded-xl">
                  <TabsTrigger 
                    value="library"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-3.5 h-3.5" />
                      <span>从命令库选择</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="new"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5" />
                      <span>输入新命令</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
                 
                {/* Tab 内容：从命令库选择 */}
                <TabsContent value="library" className="mt-3.5">
                  <div className="space-y-3.5">
                    {/* 搜索框 */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <Input
                        placeholder="搜索命令库..."
                        value={addDialogSearchQuery}
                        onChange={(e) => setAddDialogSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    
                    {/* 命令列表（复选框） */}
                    <ScrollArea className="h-[260px] pr-4">
                      <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                        {commands
                          .filter(cmd =>
                            cmd.content.toLowerCase().includes(addDialogSearchQuery.toLowerCase()) ||
                            cmd.description.toLowerCase().includes(addDialogSearchQuery.toLowerCase())
                          )
                          .map((cmd) => (
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
                                {cmd.details && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{cmd.details}</p>}
                              </div>
                            </label>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
                
                {/* Tab 内容：输入新命令 */}
                <TabsContent value="new" className="mt-3.5 space-y-3.5">
                  <div>
                    <Label htmlFor="new-command-content" className="mb-2">命令内容</Label>
                    <Textarea
                      id="new-command-content"
                      placeholder="例如: npm install react"
                      value={addDialogNewCommand.content}
                      onChange={(e) => setAddDialogNewCommand({ ...addDialogNewCommand, content: e.target.value })}
                      className="font-mono min-h-[88px]"
                      onFocus={handleInputFocus}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-command-description" className="mb-2">命令说明</Label>
                    <Input
                      id="new-command-description"
                      placeholder="简短描述"
                      value={addDialogNewCommand.description}
                      onChange={(e) => setAddDialogNewCommand({ ...addDialogNewCommand, description: e.target.value })}
                      onFocus={handleInputFocus}
                    />
                  </div>
                <div className="mb-6">
                  <Label htmlFor="new-command-details" className="mb-2">命令介绍</Label>
                  <Textarea
                    id="new-command-details"
                    placeholder="详细说明"
                    value={addDialogNewCommand.details}
                    onChange={(e) => setAddDialogNewCommand({ ...addDialogNewCommand, details: e.target.value })}
                    className="min-h-[60px]"
                    onFocus={handleInputFocus}
                  />
                </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (addDialogNewCommand.content.trim()) {
                        setNewPreset({
                          ...newPreset,
                          commands: [
                            ...newPreset.commands,
                            { 
                              id: `${Date.now()}`,
                              content: addDialogNewCommand.content,
                              description: addDialogNewCommand.description,
                              details: addDialogNewCommand.details,
                              order: newPreset.commands.length 
                            },
                          ],
                        });
                        setAddDialogNewCommand({ content: '', description: '', details: '' });
                        toast.success('命令已添加到列表');
                      } else {
                        toast.error('命令内容不能为空');
                      }
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    添加到命令列表
                  </Button>
                </TabsContent>
              </Tabs>

                </div>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-3.5">
            <Button variant="outline" onClick={handleCloseAddDialog}>
              取消
            </Button>
            <Button onClick={() => {
              if (newPreset.name.trim()) {
                handleAddPreset();
              } else if (!newPreset.name.trim()) {
                toast.error('预设名称不能为空');
              }
            }}>
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent 
          className="max-w-4xl max-h-[80vh] flex flex-col overflow-hidden p-0 gap-0"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <Edit className="w-4.5 h-4.5" />
              </span>
              <span className="flex flex-col gap-1">
                <span>编辑预设</span>
                <span className="text-sm font-normal text-gray-500">调整预设名称、说明和命令组成，保存后会立即生效。</span>
              </span>
            </DialogTitle>
          </DialogHeader>
          {editingPreset && (
            <>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
                <div className="space-y-3.5">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4.5 shadow-sm">
                      <div className="mb-3.5 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">基础信息</h3>
                          <p className="mt-1 text-xs text-gray-500">保留原有结构，只更新你想修改的内容。</p>
                        </div>
                        <Badge variant="outline" className="text-xs">基础区</Badge>
                      </div>

                      <div className="space-y-3.5">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name" className="mb-2">预设名称</Label>
                          <Input
                            id="edit-name"
                            value={editingPreset.name}
                            onChange={(e) => setEditingPreset(prev => prev ? { ...prev, name: e.target.value } : null)}
                            autoFocus={false}
                            onFocus={handleInputFocus}
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description" className="mb-2">描述（可选）</Label>
                          <Textarea
                            id="description"
                            value={editingPreset.description || ''}
                            onChange={(e) => setEditingPreset(prev => prev ? { ...prev, description: e.target.value } : null)}
                            placeholder="简要描述这个预设的用途"
                            onFocus={handleInputFocus}
                            className="min-h-[88px]"
                          />
                        </div>
                      </div>
                    </div>
                  
                    <div className="rounded-2xl border border-gray-200 bg-white p-4.5 shadow-sm">
                      <div className="mb-3.5 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">命令组成</h3>
                          <p className="mt-1 text-xs text-gray-500">可以继续从命令库勾选，或追加新的命令内容。</p>
                        </div>
                        <Badge variant="outline" className="text-xs">命令区</Badge>
                      </div>

                      <Tabs defaultValue="library" className="w-full">
                    {/* Tab 切换器 */}
                    <TabsList className="grid w-full grid-cols-2 h-10 bg-gray-100 p-0.75 rounded-xl">
                      <TabsTrigger 
                        value="library"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-center gap-2">
                          <Search className="w-3.5 h-3.5" />
                          <span>从命令库选择</span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="new"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-3.5 h-3.5" />
                          <span>输入新命令</span>
                        </div>
                      </TabsTrigger>
                    </TabsList>
                    
                     {/* Tab 内容：从命令库选择 */}
                    <TabsContent value="library" className="mt-3.5">
                      <div className="space-y-3.5">
                        {/* 搜索框 */}
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <Input
                            placeholder="搜索命令库..."
                            value={editDialogSearchQuery}
                            onChange={(e) => setEditDialogSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        
                        {/* 命令列表（复选框） */}
                        <ScrollArea className="h-[260px] pr-4">
                          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                            {commands
                              .filter(cmd =>
                                cmd.content.toLowerCase().includes(editDialogSearchQuery.toLowerCase()) ||
                                cmd.description.toLowerCase().includes(editDialogSearchQuery.toLowerCase())
                              )
                              .map((cmd) => (
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
                                    {cmd.details && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{cmd.details}</p>}
                                  </div>
                                </label>
                              ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                    
                     {/* Tab 内容：输入新命令 */}
                    <TabsContent value="new" className="mt-3.5 space-y-3.5">
                      <div>
                        <Label htmlFor="edit-new-command-content" className="mb-2">命令内容</Label>
                        <Textarea
                          id="edit-new-command-content"
                          placeholder="例如: npm install react"
                          value={editDialogNewCommand.content}
                          onChange={(e) => setEditDialogNewCommand({ ...editDialogNewCommand, content: e.target.value })}
                          className="font-mono min-h-[88px]"
                          onFocus={handleInputFocus}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-new-command-description" className="mb-2">命令说明</Label>
                        <Input
                          id="edit-new-command-description"
                          placeholder="简短描述"
                          value={editDialogNewCommand.description}
                          onChange={(e) => setEditDialogNewCommand({ ...editDialogNewCommand, description: e.target.value })}
                          onFocus={handleInputFocus}
                        />
                      </div>
                      <div className="mb-6">
                        <Label htmlFor="edit-new-command-details" className="mb-2">命令介绍</Label>
                        <Textarea
                          id="edit-new-command-details"
                          placeholder="详细说明"
                          value={editDialogNewCommand.details}
                          onChange={(e) => setEditDialogNewCommand({ ...editDialogNewCommand, details: e.target.value })}
                          className="min-h-[60px]"
                          onFocus={handleInputFocus}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (editDialogNewCommand.content.trim()) {
                            setEditingPreset(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                commands: [
                                  ...prev.commands,
                                  { 
                                    id: `${Date.now()}`,
                                    content: editDialogNewCommand.content,
                                    description: editDialogNewCommand.description,
                                    details: editDialogNewCommand.details,
                                    order: prev.commands.length 
                                  },
                                ],
                              };
                            });
                            setEditDialogNewCommand({ content: '', description: '', details: '' });
                            toast.success('命令已添加到列表');
                          } else {
                            toast.error('命令内容不能为空');
                          }
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        添加到命令列表
                      </Button>
                    </TabsContent>
                  </Tabs>

                    </div>
                </div>
              </div>
            </>
          )}
          <DialogFooter className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-3.5">
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditDialogSearchQuery('');
              setEditDialogSelectedCommand(null);
              setEditDialogNewCommand({ content: '', description: '', details: '' });
            }}>
              取消
            </Button>
            <Button onClick={() => {
              if (editingPreset?.name.trim()) {
                handleEditPreset();
              } else if (!editingPreset?.name.trim()) {
                toast.error('预设名称不能为空');
              }
            }}>
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
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

      <AlertDialog open={showDraftConfirmDialog} onOpenChange={setShowDraftConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>保存草稿？</AlertDialogTitle>
            <AlertDialogDescription>
              您有未保存的内容，是否将其保存为草稿？下次打开时将自动加载。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={discardDraft}>不保存</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSaveDraft}>保存草稿</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SelectedCommandsFloating 
        visible={showAddDialog}
        commands={newPreset.commands}
        onRemove={(id) => setNewPreset({ ...newPreset, commands: newPreset.commands.filter(c => c.id !== id) })}
        onClear={() => setNewPreset({ ...newPreset, commands: [] })}
        onMoveUp={(index) => {
           const newCommands = [...newPreset.commands];
           if (index > 0) {
              const temp = newCommands[index];
              newCommands[index] = newCommands[index - 1];
              newCommands[index - 1] = temp;
              newCommands.forEach((c, idx) => c.order = idx);
              setNewPreset({ ...newPreset, commands: newCommands });
           }
         }}
         onMoveDown={(index) => {
           const newCommands = [...newPreset.commands];
           if (index < newCommands.length - 1) {
              const temp = newCommands[index];
              newCommands[index] = newCommands[index + 1];
              newCommands[index + 1] = temp;
              newCommands.forEach((c, idx) => c.order = idx);
              setNewPreset({ ...newPreset, commands: newCommands });
           }
         }}
      />

      <SelectedCommandsFloating 
        visible={showEditDialog && !!editingPreset}
        commands={editingPreset?.commands || []}
        onRemove={(id) => setEditingPreset(prev => prev ? { ...prev, commands: prev.commands.filter(c => c.id !== id) } : null)}
        onClear={() => setEditingPreset(prev => prev ? { ...prev, commands: [] } : null)}
        onMoveUp={(index) => {
          if (!editingPreset) return;
          const newCommands = [...editingPreset.commands];
          if (index > 0) {
             const temp = newCommands[index];
             newCommands[index] = newCommands[index - 1];
             newCommands[index - 1] = temp;
             newCommands.forEach((c, idx) => c.order = idx);
             setEditingPreset({ ...editingPreset, commands: newCommands });
          }
        }}
        onMoveDown={(index) => {
          if (!editingPreset) return;
          const newCommands = [...editingPreset.commands];
          if (index < newCommands.length - 1) {
             const temp = newCommands[index];
             newCommands[index] = newCommands[index + 1];
             newCommands[index + 1] = temp;
             newCommands.forEach((c, idx) => c.order = idx);
             setEditingPreset({ ...editingPreset, commands: newCommands });
          }
        }}
      />
    </div>
  );
}
