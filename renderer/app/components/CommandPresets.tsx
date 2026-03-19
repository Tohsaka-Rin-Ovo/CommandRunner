import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { Database, Server, Code, Package, Plus, Play, Edit, Trash2, ChevronRight, ChevronDown, RotateCcw, CheckCircle, AlertCircle, BookmarkPlus, ArrowUpDown, ArrowUp, ArrowDown, Search, Save, X } from "lucide-react";
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
import type { Command, Preset } from "@shared/types";
import { SelectedCommandsFloating } from "./SelectedCommandsFloating";
import { handleInputFocus } from "../utils/focusUtils";
import { highlightText } from "../utils/highlightText";

const PRESET_ICONS = {
  database: Database,
  server: Server,
  code: Code,
  package: Package,
} as const;

export default function CommandPresets() {
  const navigate = useNavigate();
  const SEARCH_STORAGE_KEY = 'command-presets-search-query'
  const PAGE_STORAGE_KEY = 'command-presets-current-page'
  const location = useLocation();
  const presets = usePresetStore((state) => state.presets);
  const loading = usePresetStore((state) => state.loading);
  const fetchPresets = usePresetStore((state) => state.fetchPresets);
  const savePreset = usePresetStore((state) => state.savePreset);
  const updatePreset = usePresetStore((state) => state.updatePreset);
  const deletePreset = usePresetStore((state) => state.deletePreset);

  const commands = useCommandStore((state) => state.commands);
  const saveCommand = useCommandStore((state) => state.saveCommand);
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [preserveSearchOnNavigation, setPreserveSearchOnNavigation] = useState(false);
  const [preservePageOnNavigation, setPreservePageOnNavigation] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [terminalMode, setTerminalMode] = useState<'internal' | 'external'>('external');
  const itemsPerPage = 8;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const addDialogContentRef = useRef<HTMLDivElement>(null);
  const editDialogContentRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleScrollRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);
  
  useEffect(() => {
    const loadGlobalSettings = async () => {
      try {
        if (window.electronAPI?.getGlobalSettings) {
          const settings = await window.electronAPI.getGlobalSettings()
          const nextPreserveSearch = settings?.preserveSearchOnNavigation ?? false
          const nextPreservePage = settings?.preservePageOnNavigation ?? false

          setTerminalMode(settings?.terminalMode || 'internal')
          setPreserveSearchOnNavigation(nextPreserveSearch)
          setPreservePageOnNavigation(nextPreservePage)

          if (nextPreserveSearch) {
            const savedSearchQuery = sessionStorage.getItem(SEARCH_STORAGE_KEY) || ''
            if (savedSearchQuery) {
              setSearchQuery(savedSearchQuery)
              setIsSearchOpen(true)
            }
          } else {
            sessionStorage.removeItem(SEARCH_STORAGE_KEY)
          }

          if (nextPreservePage) {
            const savedPage = sessionStorage.getItem(PAGE_STORAGE_KEY)
            if (savedPage) {
              setCurrentPage(Math.max(1, Number(savedPage) || 1))
            }
          } else {
            sessionStorage.removeItem(PAGE_STORAGE_KEY)
          }

          setSettingsLoaded(true)
        }
      } catch (error) {
        console.error('Failed to load global settings:', error)
        setSettingsLoaded(true)
      }
    }

    loadGlobalSettings()

    const handleSettingsChange = () => {
      loadGlobalSettings()
    }

    window.addEventListener('settings-changed', handleSettingsChange)

    return () => {
      window.removeEventListener('settings-changed', handleSettingsChange)
    }
  }, [])

  useEffect(() => {
    if (!settingsLoaded) return

    if (!preserveSearchOnNavigation) {
      sessionStorage.removeItem(SEARCH_STORAGE_KEY)
      return
    }

    if (searchQuery.trim()) {
      sessionStorage.setItem(SEARCH_STORAGE_KEY, searchQuery)
    } else {
      sessionStorage.removeItem(SEARCH_STORAGE_KEY)
    }
  }, [preserveSearchOnNavigation, searchQuery, settingsLoaded])

  useEffect(() => {
    if (!settingsLoaded) return

    if (!preservePageOnNavigation) {
      sessionStorage.removeItem(PAGE_STORAGE_KEY)
      return
    }

    sessionStorage.setItem(PAGE_STORAGE_KEY, String(currentPage))
  }, [preservePageOnNavigation, currentPage, settingsLoaded])
  
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

  useEffect(() => {
    if (!isSearchOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSearchOpen]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedPresets);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPresets(newExpanded);
  };

  const buildCommandFromDraft = (draft: { content: string; description: string; details: string }) => {
    const now = Date.now();
    const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;

    const command: Command = {
      id,
      content: draft.content.trim(),
      description: draft.description.trim(),
      details: draft.details.trim(),
      createdAt: now,
      updatedAt: now,
    };

    return command;
  };

  const addCommandToPresetDraft = (command: Command, target: 'new' | 'edit') => {
    if (target === 'new') {
      setNewPreset((prev) => ({
        ...prev,
        commands: [
          ...prev.commands,
          {
            id: command.id,
            content: command.content,
            description: command.description,
            details: command.details,
            order: prev.commands.length,
          },
        ],
      }));
      return;
    }

    setEditingPreset((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        commands: [
          ...prev.commands,
          {
            id: command.id,
            content: command.content,
            description: command.description,
            details: command.details,
            order: prev.commands.length,
          },
        ],
      };
    });
  };

  const handleAddDraftCommand = async (target: 'library' | 'preset', mode: 'new' | 'edit') => {
    const draft = mode === 'new' ? addDialogNewCommand : editDialogNewCommand;

    if (!draft.content.trim()) {
      toast.error('命令内容不能为空');
      return;
    }

    const command = buildCommandFromDraft(draft);

    if (target === 'library') {
      await saveCommand(command);
      toast.success('命令已添加到命令列表');
    } else {
      addCommandToPresetDraft(command, mode);
      toast.success('命令已添加到当前预设');
    }

    if (mode === 'new') {
      setAddDialogNewCommand({ content: '', description: '', details: '' });
    } else {
      setEditDialogNewCommand({ content: '', description: '', details: '' });
    }
  };

  const reorderPresetCommands = <T extends { order: number }>(
    list: T[],
    fromIndex: number,
    toIndex: number,
    position: 'before' | 'after'
  ) => {
    const nextList = [...list];
    const [movedItem] = nextList.splice(fromIndex, 1);

    let insertIndex = toIndex;
    if (fromIndex < toIndex) {
      insertIndex -= 1;
    }
    if (position === 'after') {
      insertIndex += 1;
    }

    nextList.splice(insertIndex, 0, movedItem);

    return nextList.map((item, index) => ({
      ...item,
      order: index,
    }));
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

    try {
      const success = await deletePreset(presetToDelete);

      if (success) {
        toast.success("预设删除成功");

        const totalAfterDelete = sortedPresets.length - 1;
        const newTotalPages = Math.ceil(totalAfterDelete / itemsPerPage);
        if (currentPage > newTotalPages && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      } else {
        toast.error("预设删除失败，请稍后重试");
      }
    } catch (error) {
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

  const filteredPresets = presets.filter((preset) => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) return true;

    return [
      preset.name,
      preset.description || '',
      ...preset.commands.map((cmd) => cmd.content),
      ...preset.commands.map((cmd) => cmd.description || ''),
      ...preset.commands.map((cmd) => cmd.details || ''),
    ].some((value) => value.toLowerCase().includes(keyword));
  });

  const sortedPresets = [...filteredPresets].sort((a, b) => {
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

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

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
      return <RotateCcw className="w-4 h-4 text-blue-600 animate-spin" />;
    } else if (status === "completed") {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (status === "stopped") {
      return <AlertCircle className="w-4 h-4 text-amber-600" />;
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold text-gray-900">命令预设</h2>
              <div ref={searchContainerRef} className="relative" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`relative h-8 w-8 rounded-full transition-all hover:text-gray-600 hover:bg-gray-100 ${searchQuery.trim() ? 'search-active-pulse bg-blue-50 text-blue-600 ring-1 ring-blue-200 hover:bg-blue-100' : isSearchOpen ? 'bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  title="搜索预设"
                >
                  <Search className="w-4 h-4" />
                  {searchQuery.trim() && (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
                  )}
                </Button>
                {isSearchOpen && (
                  <div className="absolute left-0 top-10 z-20 w-72 rounded-xl border border-gray-200 bg-white p-2.5 shadow-lg">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 w-3.5 h-3.5 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="搜索预设名、描述或命令内容..."
                        className="h-9 pl-9 pr-8 text-sm"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          onClick={() => {
                            setSearchQuery('');
                            setCurrentPage(1);
                          }}
                          title="清空搜索"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {searchQuery.trim() && (
                      <p className="mt-2 px-1 text-xs text-gray-500">
                        找到 {sortedPresets.length} 个匹配的预设
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-1.5">
              <p className="text-sm text-gray-600">快速访问常用命令集合</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                  共 {presets.length} 个预设
                </span>
                <button
                  type="button"
                  className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                  onClick={() => navigate('/running')}
                  title="查看正在运行页面"
                >
                  {Array.from(activePresets.values()).filter(p => p.overallStatus === 'running').length} 个正在运行记录
                </button>
                {searchQuery.trim() && (
                  <span className="group inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    <span>匹配 {filteredPresets.length} 个结果</span>
                    <button
                      type="button"
                      className="hidden rounded-full p-0.5 text-blue-500 transition-colors hover:bg-blue-200 hover:text-blue-700 group-hover:inline-flex"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      title="清空搜索"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
              <Label htmlFor="default-sort" className="text-sm text-gray-600 cursor-pointer select-none">启用拖拽排序</Label>
              <Switch
                id="default-sort"
                checked={useDefaultSort}
                onCheckedChange={(checked) => setSortConfig({ useDefaultSort: checked })}
              />
            </div>
            <div className={`flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 px-1 py-1 transition-all duration-200 ${useDefaultSort ? 'opacity-40 pointer-events-none' : 'hover:border-gray-300'}`}>
              <DropdownMenu onOpenChange={setIsSortDropdownOpen}>
                <DropdownMenuTrigger asChild disabled={useDefaultSort}>
                  <Button variant="ghost" size="sm" className={`h-8 gap-1 px-2 font-normal text-gray-700 hover:text-gray-900 ${useDefaultSort ? 'cursor-not-allowed' : ''}`} disabled={useDefaultSort}>
                    <span className="text-xs">{sortBy === 'name' ? '名称' : '时间'}</span>
                    <ChevronDown 
                      className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : ''}`} 
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
              <div className="w-px h-4 bg-gray-200 mx-0.5" />
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-7 w-7 hover:bg-gray-200 ${useDefaultSort ? 'cursor-not-allowed' : ''}`}
                onClick={() => setSortConfig({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' })}
                title={sortOrder === 'asc' ? '切换为降序' : '切换为升序'}
                disabled={useDefaultSort}
              >
                {sortOrder === 'asc' ? (
                  <ArrowUp className="w-3 h-3 text-gray-500" />
                ) : (
                  <ArrowDown className="w-3 h-3 text-gray-500" />
                )}
              </Button>
            </div>
            <Button onClick={handleOpenAddDialog}>
              <Plus className="w-4 h-4 mr-1.5" />
              添加预设
            </Button>
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto p-6 custom-scrollbar"
        ref={scrollContainerRef}
        onClick={() => {
          if (isSearchOpen) {
            setIsSearchOpen(false);
          }
        }}
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">加载中...</div>
                </div>
               ) : sortedPresets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                    <Package className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {searchQuery.trim() ? '没有找到匹配的预设' : '还没有任何预设'}
                  </h3>
                  <p className="text-sm mb-6 max-w-md text-center">
                    {searchQuery.trim()
                      ? '试试更换关键词，或者搜索命令内容、描述等信息'
                      : '预设可以帮助您将多个命令组合在一起，一键执行常用流程'}
                  </p>
                  {searchQuery.trim() ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                    >
                      清空搜索
                    </Button>
                  ) : (
                    <Button onClick={handleOpenAddDialog}>
                      <Plus className="w-4 h-4 mr-2" />
                      创建第一个预设
                    </Button>
                  )}
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
                             className={`group bg-white rounded-xl border relative transition-all duration-200 shadow-sm hover:shadow-md
                               ${isDragging && draggingId === preset.id ? 'opacity-40 scale-95 border-2 border-dashed border-gray-300' : 'border-gray-200 hover:border-gray-300'}
                               ${dragOverId === preset.id && dropPosition === 'before' ? 'border-l-[4px] border-l-blue-500 pl-1' : ''}
                               ${dragOverId === preset.id && dropPosition === 'after' ? 'border-r-[4px] border-r-blue-500 pr-1' : ''}
                               ${isExpanded ? 'ring-2 ring-blue-100' : ''}
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
                                  className="flex items-start gap-3.5 flex-1 cursor-pointer min-w-0"
                                  onClick={() => toggleExpand(preset.id)}
                                >
                                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                                    execution?.overallStatus === 'running' ? 'bg-blue-100 ring-2 ring-blue-200' :
                                    execution?.completed ? 'bg-green-100' :
                                    execution?.stopRequested ? 'bg-yellow-100' :
                                    'bg-gradient-to-br from-blue-50 to-blue-100'
                                  }`}>
                                    <Icon className={`w-5 h-5 transition-colors ${
                                      execution?.overallStatus === 'running' ? 'text-blue-600' :
                                      execution?.completed ? 'text-green-600' :
                                      execution?.stopRequested ? 'text-yellow-600' :
                                      'text-blue-600'
                                    }`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2.5">
                                      <h3 className="font-semibold text-gray-900 truncate text-[15px]">{highlightText(preset.name, searchQuery)}</h3>
                                      {getStatusIcon(execution?.completed ? "completed" : execution?.stopRequested ? "stopped" : execution?.overallStatus === 'running' ? "running" : undefined)}
                                    </div>
                                    {preset.description && (
                                      <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{highlightText(preset.description, searchQuery)}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2.5">
                                      <Badge variant="secondary" className="text-[11px] px-2 py-0.5 h-5">
                                        {preset.commands.length} 个命令
                                      </Badge>
                                      {execution && (
                                        <Badge variant="outline" className="text-[11px] px-2 py-0.5 h-5">
                                          {execution.currentIndex}/{execution.total}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0">
                                  <div 
                                    className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 mr-0.5 transition-colors"
                                    onClick={() => toggleExpand(preset.id)}
                                    title={isExpanded ? '收起详情' : '展开详情'}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4.5 h-4.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                    ) : (
                                      <ChevronRight className="w-4.5 h-4.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-100 hover:text-blue-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingPreset(preset);
                                      setShowEditDialog(true);
                                    }}
                                    title="编辑"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePreset(preset.id);
                                    }}
                                    title="删除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="mt-4.5 pt-4.5 border-t border-gray-100/80">
                                  <div className="flex gap-2 mb-3.5">
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
                                            <Play className="w-3.5 h-3.5 mr-1" />
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
                                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
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
                                            <Play className="w-3.5 h-3.5 mr-1" />
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

                                  {preset.commands.length === 0 ? (
                                    <div className="text-center py-6 text-gray-400 text-sm bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                      此预设暂无命令，请点击"编辑预设"添加
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {preset.commands.map((cmd, index) => {
                                        const isCompleted = execution && execution.currentIndex > index;
                                        const isCurrent = execution && execution.currentIndex === index + 1;
                                        return (
                                          <div
                                            key={cmd.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                                              isCompleted
                                                ? "bg-green-50/80 border border-green-200"
                                                : isCurrent
                                                ? "bg-blue-50/90 border-2 border-blue-300 ring-2 ring-blue-100"
                                                : "bg-gray-50/50 border border-gray-200 hover:bg-gray-50"
                                            }`}
                                          >
                                            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 ${
                                              isCompleted
                                                ? 'bg-green-200 text-green-700'
                                                : isCurrent
                                                ? 'bg-blue-200 text-blue-700 ring-2 ring-blue-300'
                                                : 'bg-gray-200 text-gray-500'
                                            }`}>
                                              {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <code className={`text-sm font-mono block ${
                                                isCurrent ? 'text-blue-700 font-medium' : 'text-gray-700'
                                              }`}>
                                                {highlightText(cmd.content, searchQuery)}
                                              </code>
                                              {cmd.description && (
                                                <p className="text-xs text-gray-500 mt-1">{highlightText(cmd.description, searchQuery)}</p>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              {isCompleted && (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                              )}
                                              {isCurrent && (
                                                <div className="flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-full">
                                                  <RotateCcw className="w-3 h-3 animate-spin" />
                                                  执行中
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
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
          ref={addDialogContentRef}
          className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0 rounded-2xl shadow-2xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex-shrink-0 border-b border-gray-200/80 bg-gradient-to-b from-white to-gray-50/50 px-6 py-5">
            <DialogTitle className="flex items-center gap-3.5 text-[17px]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 shadow-sm">
                <Package className="w-5 h-5" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2.5 flex-wrap">
                  <span>添加预设</span>
                  {newPreset.commands.length > 0 && (
                    <Badge variant="outline" className="text-[11px] font-normal px-2 h-5 text-blue-600 border-blue-200">
                      已选 {newPreset.commands.length} 条
                    </Badge>
                  )}
                  {draftPreset && <Badge variant="secondary" className="text-[11px] font-normal px-2 h-5">草稿</Badge>}
                </span>
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
            <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-[13px] font-semibold text-gray-900">基础信息</h3>
                      <p className="mt-1 text-xs text-gray-500">为这个预设起一个清晰的名称，可以补充用途说明</p>
                    </div>
                    <Badge variant="outline" className="text-[11px]">步骤 1</Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[13px]">预设名称 <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        value={newPreset.name}
                        onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                        placeholder="例如：开发环境启动"
                        autoFocus={false}
                        onFocus={handleInputFocus}
                        className="h-10.5 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-[13px]">描述（可选）</Label>
                      <Textarea
                        id="description"
                        value={newPreset.description || ''}
                        onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
                        placeholder="简要描述这个预设的用途"
                        onFocus={handleInputFocus}
                        className="min-h-[76px] text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-[13px] font-semibold text-gray-900">命令组成</h3>
                      <p className="mt-1 text-xs text-gray-500">从命令库中选择，或直接输入新的命令</p>
                    </div>
                    <Badge variant="outline" className="text-[11px]">步骤 2</Badge>
                  </div>

                  <Tabs defaultValue="library" className="w-full">
                 {/* Tab 切换器 */}
                <TabsList className="grid w-full grid-cols-2 h-10 bg-gray-100/70 p-0.75 rounded-xl">
                  <TabsTrigger
                    value="library"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 text-[13px]"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-3.5 h-3.5" />
                      <span>从命令库选择</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="new"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 text-[13px]"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5" />
                      <span>输入新命令</span>
                    </div>
                  </TabsTrigger>
                </TabsList>

                {/* Tab 内容：从命令库选择 */}
                <TabsContent value="library" className="mt-4">
                  <div className="space-y-3.5">
                    {/* 搜索框 */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <Input
                        placeholder="搜索命令..."
                        value={addDialogSearchQuery}
                        onChange={(e) => setAddDialogSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm"
                      />
                    </div>

                    {/* 命令列表（复选框） */}
                    <ScrollArea className="h-[280px] pr-4">
                      <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                        {commands
                          .filter(cmd =>
                            cmd.content.toLowerCase().includes(addDialogSearchQuery.toLowerCase()) ||
                            cmd.description.toLowerCase().includes(addDialogSearchQuery.toLowerCase())
                          )
                          .map((cmd) => {
                            const isSelected = newPreset.commands.some((c) => c.id === cmd.id);
                            return (
                              <label
                                key={cmd.id}
                                className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-blue-50 border border-blue-200'
                                    : 'hover:bg-white hover:shadow-sm border border-transparent'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
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
                                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <code className="text-sm font-mono block truncate">{highlightText(cmd.content, addDialogSearchQuery)}</code>
                                  {cmd.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{highlightText(cmd.description, addDialogSearchQuery)}</p>}
                                  {cmd.details && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{highlightText(cmd.details, addDialogSearchQuery)}</p>}
                                </div>
                              </label>
                            );
                          })}
                        {commands.filter(cmd =>
                          cmd.content.toLowerCase().includes(addDialogSearchQuery.toLowerCase()) ||
                          cmd.description.toLowerCase().includes(addDialogSearchQuery.toLowerCase())
                        ).length === 0 && (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            没有找到匹配的命令
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                {/* Tab 内容：输入新命令 */}
                <TabsContent value="new" className="mt-4 space-y-3.5">
                  <div>
                    <Label htmlFor="new-command-content" className="text-[13px]">命令内容 <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="new-command-content"
                      placeholder="例如: npm install react"
                      value={addDialogNewCommand.content}
                      onChange={(e) => setAddDialogNewCommand({ ...addDialogNewCommand, content: e.target.value })}
                      className="font-mono min-h-[76px] text-sm resize-none"
                      onFocus={handleInputFocus}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-command-description" className="text-[13px]">命令说明</Label>
                    <Input
                      id="new-command-description"
                      placeholder="简短描述"
                      value={addDialogNewCommand.description}
                      onChange={(e) => setAddDialogNewCommand({ ...addDialogNewCommand, description: e.target.value })}
                      onFocus={handleInputFocus}
                      className="h-9 text-sm"
                    />
                  </div>
                <div className="mb-6">
                  <Label htmlFor="new-command-details" className="text-[13px]">命令介绍</Label>
                  <Textarea
                    id="new-command-details"
                    placeholder="详细说明"
                    value={addDialogNewCommand.details}
                    onChange={(e) => setAddDialogNewCommand({ ...addDialogNewCommand, details: e.target.value })}
                    className="min-h-[60px] text-sm resize-none"
                    onFocus={handleInputFocus}
                  />
                </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleAddDraftCommand('library', 'new')}
                      className="w-full"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      添加到命令列表
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleAddDraftCommand('preset', 'new')}
                      className="w-full"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      添加到当前预设
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

                </div>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 border-t border-gray-200/80 bg-gradient-to-b from-gray-50/50 to-white px-6 py-4 gap-3">
            <Button variant="outline" onClick={handleCloseAddDialog} className="h-10">
              取消
            </Button>
            <Button onClick={() => {
              if (newPreset.name.trim()) {
                handleAddPreset();
              } else {
                toast.error('预设名称不能为空');
              }
            }} className="h-10 min-w-[120px]">
              <Save className="w-4 h-4 mr-1.5" />
              保存预设
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent
          ref={editDialogContentRef}
          className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0 rounded-2xl shadow-2xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex-shrink-0 border-b border-gray-200/80 bg-gradient-to-b from-white to-gray-50/50 px-6 py-5">
            <DialogTitle className="flex items-center gap-3.5 text-[17px]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 shadow-sm">
                <Edit className="w-5 h-5" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2.5 flex-wrap">
                  <span>编辑预设</span>
                  {editingPreset?.commands.length > 0 && (
                    <Badge variant="outline" className="text-[11px] font-normal px-2 h-5 text-emerald-600 border-emerald-200">
                      已选 {editingPreset.commands.length} 条
                    </Badge>
                  )}
                </span>
                <span className="text-[12px] font-normal text-gray-500">调整预设信息，保存后会立即生效</span>
              </span>
            </DialogTitle>
          </DialogHeader>
          {editingPreset && (
            <>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
                <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-[13px] font-semibold text-gray-900">基础信息</h3>
                          <p className="mt-1 text-xs text-gray-500">保留原有结构，只更新你想修改的内容</p>
                        </div>
                        <Badge variant="outline" className="text-[11px]">基础区</Badge>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name" className="text-[13px]">预设名称 <span className="text-red-500">*</span></Label>
                          <Input
                            id="edit-name"
                            value={editingPreset.name}
                            onChange={(e) => setEditingPreset(prev => prev ? { ...prev, name: e.target.value } : null)}
                            autoFocus={false}
                            onFocus={handleInputFocus}
                            className="h-10.5 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description" className="text-[13px]">描述（可选）</Label>
                          <Textarea
                            id="description"
                            value={editingPreset.description || ''}
                            onChange={(e) => setEditingPreset(prev => prev ? { ...prev, description: e.target.value } : null)}
                            placeholder="简要描述这个预设的用途"
                            onFocus={handleInputFocus}
                            className="min-h-[76px] text-sm resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-[13px] font-semibold text-gray-900">命令组成</h3>
                          <p className="mt-1 text-xs text-gray-500">从命令库勾选，或追加新的命令内容</p>
                        </div>
                        <Badge variant="outline" className="text-[11px]">命令区</Badge>
                      </div>

                      <Tabs defaultValue="library" className="w-full">
                    {/* Tab 切换器 */}
                    <TabsList className="grid w-full grid-cols-2 h-10 bg-gray-100/70 p-0.75 rounded-xl">
                      <TabsTrigger
                        value="library"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 text-[13px]"
                      >
                        <div className="flex items-center gap-2">
                          <Search className="w-3.5 h-3.5" />
                          <span>从命令库选择</span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger
                        value="new"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 text-[13px]"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-3.5 h-3.5" />
                          <span>输入新命令</span>
                        </div>
                      </TabsTrigger>
                    </TabsList>

                     {/* Tab 内容：从命令库选择 */}
                    <TabsContent value="library" className="mt-4">
                      <div className="space-y-3.5">
                        {/* 搜索框 */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <Input
                            placeholder="搜索命令..."
                            value={editDialogSearchQuery}
                            onChange={(e) => setEditDialogSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-sm"
                          />
                        </div>

                        {/* 命令列表（复选框） */}
                        <ScrollArea className="h-[280px] pr-4">
                          <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                            {commands
                              .filter(cmd =>
                                cmd.content.toLowerCase().includes(editDialogSearchQuery.toLowerCase()) ||
                                cmd.description.toLowerCase().includes(editDialogSearchQuery.toLowerCase())
                              )
                              .map((cmd) => {
                                const isSelected = editingPreset.commands.some((c) => c.id === cmd.id);
                                return (
                                  <label
                                    key={cmd.id}
                                    className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-emerald-50 border border-emerald-200'
                                        : 'hover:bg-white hover:shadow-sm border border-transparent'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
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
                                      className="mt-1 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <code className="text-sm font-mono block truncate">{highlightText(cmd.content, editDialogSearchQuery)}</code>
                                      {cmd.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{highlightText(cmd.description, editDialogSearchQuery)}</p>}
                                      {cmd.details && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{highlightText(cmd.details, editDialogSearchQuery)}</p>}
                                    </div>
                                  </label>
                                );
                              })}
                            {commands.filter(cmd =>
                              cmd.content.toLowerCase().includes(editDialogSearchQuery.toLowerCase()) ||
                              cmd.description.toLowerCase().includes(editDialogSearchQuery.toLowerCase())
                            ).length === 0 && (
                              <div className="text-center py-8 text-gray-400 text-sm">
                                没有找到匹配的命令
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>

                     {/* Tab 内容：输入新命令 */}
                    <TabsContent value="new" className="mt-4 space-y-3.5">
                      <div>
                        <Label htmlFor="edit-new-command-content" className="text-[13px]">命令内容 <span className="text-red-500">*</span></Label>
                        <Textarea
                          id="edit-new-command-content"
                          placeholder="例如: npm install react"
                          value={editDialogNewCommand.content}
                          onChange={(e) => setEditDialogNewCommand({ ...editDialogNewCommand, content: e.target.value })}
                          className="font-mono min-h-[76px] text-sm resize-none"
                          onFocus={handleInputFocus}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-new-command-description" className="text-[13px]">命令说明</Label>
                        <Input
                          id="edit-new-command-description"
                          placeholder="简短描述"
                          value={editDialogNewCommand.description}
                          onChange={(e) => setEditDialogNewCommand({ ...editDialogNewCommand, description: e.target.value })}
                          onFocus={handleInputFocus}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="mb-6">
                        <Label htmlFor="edit-new-command-details" className="text-[13px]">命令介绍</Label>
                        <Textarea
                          id="edit-new-command-details"
                          placeholder="详细说明"
                          value={editDialogNewCommand.details}
                          onChange={(e) => setEditDialogNewCommand({ ...editDialogNewCommand, details: e.target.value })}
                          className="min-h-[60px] text-sm resize-none"
                          onFocus={handleInputFocus}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleAddDraftCommand('library', 'edit')}
                          className="w-full"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          添加到命令列表
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleAddDraftCommand('preset', 'edit')}
                          className="w-full"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          添加到当前预设
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>

                    </div>
                </div>
              </div>
            </>
          )}
          <DialogFooter className="flex-shrink-0 border-t border-gray-200/80 bg-gradient-to-b from-gray-50/50 to-white px-6 py-4 gap-3">
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditDialogSearchQuery('');
              setEditDialogSelectedCommand(null);
              setEditDialogNewCommand({ content: '', description: '', details: '' });
            }} className="h-10">
              取消
            </Button>
            <Button onClick={() => {
              if (editingPreset?.name.trim()) {
                handleEditPreset();
              } else {
                toast.error('预设名称不能为空');
              }
            }} className="h-10 min-w-[120px]">
              <Save className="w-4 h-4 mr-1.5" />
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px]">确定要删除这个预设吗？</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              此操作无法撤销。这将永久删除该预设配置。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel onClick={() => setPresetToDelete(null)} className="h-10">取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePreset} className="bg-red-600 hover:bg-red-700 text-white h-10 min-w-[100px]">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDraftConfirmDialog} onOpenChange={setShowDraftConfirmDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px]">保存草稿？</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              您有未保存的内容，是否将其保存为草稿？下次打开时将自动加载。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel onClick={discardDraft} className="h-10">不保存</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSaveDraft} className="h-10 min-w-[100px]">
              保存草稿
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SelectedCommandsFloating 
        visible={showAddDialog}
        container={addDialogContentRef.current}
        commands={newPreset.commands}
        onRemove={(id) => setNewPreset({ ...newPreset, commands: newPreset.commands.filter(c => c.id !== id) })}
        onClear={() => setNewPreset({ ...newPreset, commands: [] })}
        onReorder={(fromIndex, toIndex, position) => {
          setNewPreset((prev) => ({
            ...prev,
            commands: reorderPresetCommands(prev.commands, fromIndex, toIndex, position),
          }));
        }}
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
        container={editDialogContentRef.current}
        commands={editingPreset?.commands || []}
        onRemove={(id) => setEditingPreset(prev => prev ? { ...prev, commands: prev.commands.filter(c => c.id !== id) } : null)}
        onClear={() => setEditingPreset(prev => prev ? { ...prev, commands: [] } : null)}
        onReorder={(fromIndex, toIndex, position) => {
          setEditingPreset((prev) => {
            if (!prev) return prev;

            return {
              ...prev,
              commands: reorderPresetCommands(prev.commands, fromIndex, toIndex, position),
            };
          });
        }}
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
