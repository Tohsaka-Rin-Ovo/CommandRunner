import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, GripHorizontal, ChevronDown, ChevronRight, Play, Trash2, Edit, RotateCcw, CheckCircle, XCircle, AlertCircle, MinusCircle, Bookmark } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { TerminalOutput } from "./TerminalOutput";
import { FullOutputDialog } from "./FullOutputDialog";
import { useCommandStore } from "../store/commandStore";
import { useExecutionStore } from "../store/executionStore";
import { usePresetStore } from "../store/presetStore";
import type { Command as CommandType } from "@shared/types";
import { handleInputFocus } from "../utils/focusUtils";

interface Command {
  id: string;
  content: string;
  description: string;
  details: string;
}

export default function CommandList() {
  const commands = useCommandStore((state) => state.commands);
  const fetchCommands = useCommandStore((state) => state.fetchCommands);
  const saveCommand = useCommandStore((state) => state.saveCommand);
  const updateCommand = useCommandStore((state) => state.updateCommand);
  const deleteCommand = useCommandStore((state) => state.deleteCommand);
  const reorderCommands = useCommandStore((state) => state.reorderCommands);

  const activeCommands = useExecutionStore((state) => state.activeCommands);
  const startCommand = useExecutionStore((state) => state.startCommand);
  const stopCommand = useExecutionStore((state) => state.stopCommand);
  const toggleFullOutput = useExecutionStore((state) => state.toggleFullOutput);
  const clearCommandOutput = useExecutionStore((state) => state.clearCommandOutput);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(new Set());
  const [selectedCommands, setSelectedCommands] = useState<Set<string>>(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [showSortDialog, setShowSortDialog] = useState(false);
  const [showFullOutputDialog, setShowFullOutputDialog] = useState(false);
  const [fullOutputData, setFullOutputData] = useState<{
    command: string;
    output: string;
    duration: number;
    status: 'success' | 'failed' | 'stopped';
  } | null>(null);
  const [terminalMode, setTerminalMode] = useState<'internal' | 'external'>('internal');
  const [newCommand, setNewCommand] = useState({
    content: "",
    description: "",
    details: "",
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [commandToDelete, setCommandToDelete] = useState<string | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showAddToPresetDialog, setShowAddToPresetDialog] = useState(false);
  const [selectedCommandForPreset, setSelectedCommandForPreset] = useState<Command | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleScrollRef = useRef<(() => void) | null>(null);

  const presets = usePresetStore((state) => state.presets);
  const fetchPresets = usePresetStore((state) => state.fetchPresets);
  const updatePreset = usePresetStore((state) => state.updatePreset);

  const handleAddToPreset = (command: Command) => {
    setSelectedCommandForPreset(command);
    setShowAddToPresetDialog(true);
  };

  const handleAddCommandToPreset = async (presetId: string) => {
    if (selectedCommandForPreset) {
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        const newPresetCommand = {
          id: selectedCommandForPreset.id,
          content: selectedCommandForPreset.content,
          description: selectedCommandForPreset.description,
          details: selectedCommandForPreset.details,
          order: preset.commands.length,
        };
        const updatedCommands = [...preset.commands, newPresetCommand];
        await updatePreset(presetId, { commands: updatedCommands });
        setShowAddToPresetDialog(false);
        setSelectedCommandForPreset(null);
      }
    }
  };

  useEffect(() => {
    // 延迟绑定，确保 DOM 已渲染
    const timeout = setTimeout(() => {
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

      // 保存函数引用
      handleScrollRef.current = handleScroll;

      scrollContainer.addEventListener("scroll", handleScroll);
    }, 0);

    return () => {
      clearTimeout(timeout);
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
    fetchCommands();
    fetchPresets();
  }, [fetchCommands, fetchPresets]);

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
    const handleSettingsChange = () => {
      const loadTerminalMode = async () => {
        try {
          if (window.electronAPI?.getGlobalSettings) {
            const settings = await window.electronAPI.getGlobalSettings()
            setTerminalMode(settings?.terminalMode || 'internal')
          }
        } catch (error) {
          console.error('Failed to reload terminal mode:', error)
        }
      }
      loadTerminalMode()
    }

    window.addEventListener('settings-changed', handleSettingsChange)
    return () => window.removeEventListener('settings-changed', handleSettingsChange)
  }, [])

  const totalPages = Math.ceil(commands.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCommands = commands.slice(startIndex, endIndex);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedCommands);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCommands(newExpanded);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedCommands);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCommands(newSelected);
  };

  const handleToggleAll = () => {
    const allCommandIds = commands.map(c => c.id);
    
    if (selectedCommands.size === commands.length && commands.length > 0) {
      // 如果全部选中，则取消全选
      setSelectedCommands(new Set());
    } else {
      // 否则全选
      setSelectedCommands(new Set(allCommandIds));
    }
  };

  const handleAddCommand = async () => {
    if (!newCommand.content || !newCommand.content.trim()) {
      toast.error("命令内容不能为空");
      return;
    }

    try {
      const command: CommandType = {
        id: Date.now().toString(),
        content: newCommand.content,
        description: newCommand.description,
        details: newCommand.details,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveCommand(command);

      toast.success("命令添加成功");

      setNewCommand({ content: "", description: "", details: "" });
      setShowAddDialog(false);
    } catch (error) {
      toast.error("添加命令失败：" + (error as Error).message);
    }
  };

  const handleDeleteCommand = (id: string) => {
    // 检查命令是否正在执行
    const executionId = getExecutionId(id);
    const execution = activeCommands.get(executionId);
    
    if (execution && execution.status === 'running') {
      toast.error("执行命令中，请先停止再删除");
      return;
    }

    setCommandToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDeleteCommand = async () => {
    if (commandToDelete) {
      try {
        await deleteCommand(commandToDelete);
        toast.success("命令删除成功");
        setShowDeleteDialog(false);
        setCommandToDelete(null);
      } catch (error) {
        toast.error("删除命令失败：" + (error as Error).message);
      }
    }
  };

  const confirmBulkDelete = async () => {
    try {
      for (const commandId of selectedCommands) {
        await deleteCommand(commandId);
      }
      toast.success(`已删除 ${selectedCommands.size} 个命令`);
      setShowBulkDeleteDialog(false);
      setSelectedCommands(new Set());
    } catch (error) {
      toast.error("批量删除命令失败：" + (error as Error).message);
    }
  };

  const handleEditCommand = (command: Command) => {
    setEditingCommand(command);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCommand) return;

    if (!editingCommand.content || !editingCommand.content.trim()) {
      toast.error("命令内容不能为空");
      return;
    }

    try {
      await updateCommand(editingCommand.id, editingCommand);

      toast.success("命令保存成功");

      setEditingCommand(null);
      setShowEditDialog(false);
    } catch (error) {
      toast.error("保存命令失败：" + (error as Error).message);
    }
  };

  const getExecutionId = (commandId: string) => {
    return `cmd-${commandId}`;
  };

  const handleExecute = async (commandId: string) => {
    const command = commands.find(c => c.id === commandId);
    if (command) {
      const executionId = getExecutionId(commandId);
      await window.electronAPI.executeCommand(command.content, {});
      startCommand(executionId, command.content);
      setExpandedCommands(new Set([commandId]));
    }
  };

  const handleStop = async (commandId: string) => {
    const executionId = getExecutionId(commandId);
    await window.electronAPI.stopCommand(executionId);
    stopCommand(executionId);
  };

  const handleShowFullOutput = (commandId: string) => {
    const executionId = getExecutionId(commandId);
    const execution = activeCommands.get(executionId);
    if (execution) {
      const status: 'success' | 'failed' | 'stopped' = execution.status === 'running'
        ? 'stopped'
        : execution.status === 'success' || execution.status === 'failed' || execution.status === 'stopped'
        ? execution.status
        : 'stopped';
      setFullOutputData({
        command: execution.command,
        output: execution.output,
        duration: execution.duration,
        status,
      });
      setShowFullOutputDialog(true);
    }
  };

  const getStatusIcon = (commandId: string) => {
    const executionId = getExecutionId(commandId);
    const execution = activeCommands.get(executionId);

    if (!execution || execution.status === 'pending') {
      return null;
    }

    if (execution.status === 'running') {
      return <RotateCcw className="w-5 h-5 text-blue-500 animate-spin" />;
    } else if (execution.status === 'success') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (execution.status === 'failed') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else if (execution.status === 'stopped') {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }

    return null;
  };

  const getTerminalOutput = (commandId: string) => {
    const executionId = getExecutionId(commandId);
    const execution = activeCommands.get(executionId);
    return execution || null;
  };

  const moveCommandUp = async (index: number) => {
    if (index > 0) {
      const newCommands = [...commands];
      [newCommands[index - 1], newCommands[index]] = [
        newCommands[index],
        newCommands[index - 1],
      ];
      const newOrder = newCommands.map(c => c.id);
      await reorderCommands(newOrder);
    }
  };

  const moveCommandDown = async (index: number) => {
    if (index < commands.length - 1) {
      const newCommands = [...commands];
      [newCommands[index], newCommands[index + 1]] = [
        newCommands[index + 1],
        newCommands[index],
      ];
      const newOrder = newCommands.map(c => c.id);
      await reorderCommands(newOrder);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 头部操作栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {bulkSelectMode && (
              <Checkbox
                checked={selectedCommands.size === commands.length && commands.length > 0}
                onCheckedChange={handleToggleAll}
                className="w-4 h-4"
              />
            )}
            <Button
              variant={bulkSelectMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setBulkSelectMode(!bulkSelectMode);
                setSelectedCommands(new Set());
              }}
            >
              {bulkSelectMode ? "取消批量选择" : "批量选择"}
            </Button>
            {bulkSelectMode && selectedCommands.size > 0 && (
              <span className="ml-3 text-sm text-gray-600">
                已选择 {selectedCommands.size} / {commands.length}
              </span>
            )}
            {bulkSelectMode && selectedCommands.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                删除选中 ({selectedCommands.size})
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSortDialog(true)}
            >
              <GripHorizontal className="w-4 h-4 mr-1" />
              调整顺序
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              添加命令
            </Button>
          </div>
        </div>
      </div>

      {/* 命令列表 */}
      <div className="flex-1 overflow-auto p-6 custom-scrollbar" ref={scrollContainerRef}>
        <div className="max-w-5xl mx-auto space-y-3">
          {currentCommands.map((command) => (
            <ContextMenu key={command.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={`bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow ${
                    bulkSelectMode && selectedCommands.has(command.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                  onContextMenu={(e) => {
                    console.log('ContextMenuTrigger contextmenu event', e);
                  }}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => toggleExpand(command.id)}
                  >
                    <div className="flex items-start gap-4">
                      {bulkSelectMode && (
                        <div
                          className="pt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(command.id);
                          }}
                        >
                          <Checkbox
                            checked={selectedCommands.has(command.id)}
                            onCheckedChange={() => toggleSelect(command.id)}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <code className="block bg-gray-900 text-green-400 px-4 py-3 rounded font-mono text-sm mb-3 overflow-x-auto">
                              {command.content}
                            </code>
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-sm text-gray-600">
                                {command.description}
                              </p>
                              <div className="flex items-center gap-2">
                                {expandedCommands.has(command.id) && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const execution = getTerminalOutput(command.id);
                                        if (execution?.status === 'running') {
                                          handleStop(command.id);
                                        } else {
                                          handleExecute(command.id);
                                        }
                                      }}
                                    >
                                      {getTerminalOutput(command.id)?.status === 'running' ? (
                                        <MinusCircle className="w-4 h-4 mr-1" />
                                      ) : (
                                        <Play className="w-4 h-4 mr-1" />
                                      )}
                                      {getTerminalOutput(command.id)?.status === 'running' ? '停止' : '执行'}
                                    </Button>
                                  </>
                                )}
                                {getStatusIcon(command.id)}
                                {expandedCommands.has(command.id) ? (
                                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 展开的详情部分 */}
                  {expandedCommands.has(command.id) && (
                    <div className="border-t border-gray-100">
                      <div className="px-4 pb-4 pt-4">
                        <h4 className="font-medium text-sm text-gray-900 mb-2">
                          命令介绍
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {command.details}
                        </p>
                      </div>

                      {/* 终端输出面板 */}
                      {getTerminalOutput(command.id) && (
                        <div className="px-4 pb-4">
                          <TerminalOutput
                            output={getTerminalOutput(command.id)!.output}
                            outputLines={getTerminalOutput(command.id)!.outputLines}
                            displayLines={getTerminalOutput(command.id)!.displayLines}
                            showFull={getTerminalOutput(command.id)!.showFull}
                            status={getTerminalOutput(command.id)!.status}
                            duration={getTerminalOutput(command.id)!.duration}
                            command={getTerminalOutput(command.id)!.command}
                            terminalMode={terminalMode}
                            onCopy={() => {}}
                            onSave={() => {}}
                            onClear={() => clearCommandOutput(getExecutionId(command.id))}
                            onClose={() => {
                              const newExpanded = new Set(expandedCommands);
                              newExpanded.delete(command.id);
                              setExpandedCommands(newExpanded);
                            }}
                            onToggleFull={() => {
                              if (getTerminalOutput(command.id)!.outputLines.length > 100) {
                                toggleFullOutput(getExecutionId(command.id));
                              } else {
                                handleShowFullOutput(command.id);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleEditCommand(command)}>
                  <Edit className="w-4 h-4 mr-2" />
                  编辑命令
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleAddToPreset(command)}>
                  <Bookmark className="w-4 h-4 mr-2" />
                  添加到预设！！！
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => handleDeleteCommand(command.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除命令
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>

        {/* 分页 */}
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

      {/* 添加命令对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加新命令</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="content">命令内容</Label>
              <Textarea
                id="content"
                placeholder="例如: npm install react"
                value={newCommand.content}
                onChange={(e) =>
                  setNewCommand({ ...newCommand, content: e.target.value })
                }
                className="font-mono"
                onFocus={handleInputFocus}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">命令说明</Label>
              <Input
                id="description"
                placeholder="简短描述"
                value={newCommand.description}
                onChange={(e) =>
                  setNewCommand({ ...newCommand, description: e.target.value })
                }
                onFocus={handleInputFocus}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="details">命令介绍</Label>
              <Textarea
                id="details"
                placeholder="详细说明"
                value={newCommand.details}
                onChange={(e) =>
                  setNewCommand({ ...newCommand, details: e.target.value })
                }
                onFocus={handleInputFocus}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddCommand}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑命令对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑命令</DialogTitle>
          </DialogHeader>
          {editingCommand && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-content">命令内容</Label>
                <Textarea
                  id="edit-content"
                  value={editingCommand.content}
                  onChange={(e) =>
                    setEditingCommand({
                      ...editingCommand,
                      content: e.target.value,
                    })
                  }
                  className="font-mono"
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">命令说明</Label>
                <Input
                  id="edit-description"
                  value={editingCommand.description}
                  onChange={(e) =>
                    setEditingCommand({
                      ...editingCommand,
                      description: e.target.value,
                    })
                  }
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-details">命令介绍</Label>
                <Textarea
                  id="edit-details"
                  value={editingCommand.details}
                  onChange={(e) =>
                    setEditingCommand({
                      ...editingCommand,
                      details: e.target.value,
                    })
                  }
                  onFocus={handleInputFocus}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 调整顺序对话框 */}
      <Dialog open={showSortDialog} onOpenChange={setShowSortDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>调整命令顺序</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {commands.map((command, index) => (
                <div
                  key={command.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => moveCommandUp(index)}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => moveCommandDown(index)}
                      disabled={index === commands.length - 1}
                    >
                      ↓
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <code className="text-sm font-mono text-gray-900">
                      {command.content}
                    </code>
                    <p className="text-xs text-gray-500 mt-1">
                      {command.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSortDialog(false)}>
              取消
            </Button>
            <Button onClick={() => setShowSortDialog(false)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 完整输出对话框 */}
      <FullOutputDialog
        open={showFullOutputDialog}
        onClose={() => setShowFullOutputDialog(false)}
        command={fullOutputData?.command || ""}
        output={fullOutputData?.output || ""}
        duration={fullOutputData?.duration || 0}
        status={fullOutputData?.status || 'success'}
        terminalMode={terminalMode}
      />

      {/* 添加到预设对话框 */}
      <Dialog open={showAddToPresetDialog} onOpenChange={setShowAddToPresetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加到预设</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              选择要将此命令添加到的预设：
            </p>
            {selectedCommandForPreset && (
              <code className="block bg-gray-100 p-3 rounded text-sm font-mono mb-4">
                {selectedCommandForPreset.content}
              </code>
            )}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {presets.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  暂无预设，请先创建预设
                </p>
              ) : (
                presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleAddCommandToPreset(preset.id)}
                  >
                    <Bookmark className="w-4 h-4 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {preset.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {preset.commands.length} 个命令
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddToPresetDialog(false)}
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除这个命令吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除该命令及其相关的执行历史。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCommandToDelete(null)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCommand} className="bg-red-600 hover:bg-red-700 text-white">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认对话框 */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除选中的命令吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除选中的 {selectedCommands.size} 个命令及其相关的执行历史。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-red-600 hover:bg-red-700 text-white">
              删除 ({selectedCommands.size})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
