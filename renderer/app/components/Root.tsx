import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { List, Bookmark, History, ChevronRight, Plus, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { usePresetStore } from "../store/presetStore";
import Settings from "./Settings";

export default function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const presets = usePresetStore((state) => state.presets);
  const { sortBy, sortOrder, useDefaultSort } = usePresetStore((state) => state.sortConfig);
  const draggingSource = usePresetStore((state) => state.draggingSource);
  const setDraggingSource = usePresetStore((state) => state.setDraggingSource);
  const updatePreset = usePresetStore((state) => state.updatePreset);
  const [expandedPreset, setExpandedPreset] = useState(false);
  const [showAddPresetDialog, setShowAddPresetDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleScrollRef = useRef<(() => void) | null>(null);

  const handleAddPreset = () => {
    if (newPresetName.trim()) {
      setShowAddPresetDialog(false);
      navigate("/presets", { state: { newPresetName: newPresetName.trim() } });
      setNewPresetName("");
    }
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!useDefaultSort) return;
    setDraggingId(id);
    setDraggingSource('sidebar');
    e.dataTransfer.setData('source', 'sidebar');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDraggingSource(null);
    setDragOverId(null);
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    if (!useDefaultSort || draggingSource !== 'sidebar') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggingId === targetId) {
      setDragOverId(null);
      setDropPosition(null);
      return;
    }

    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const mouseY = e.clientY;
    const threshold = rect.top + rect.height / 2;

    setDragOverId(targetId);
    if (mouseY < threshold) {
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
    if (!useDefaultSort || draggingSource !== 'sidebar') return;
    e.preventDefault();
    setDragOverId(null);
    setDropPosition(null);

    if (!draggingId || draggingId === targetId) return;

    // 这里我们需要按 order 排序的 presets，store 中的 presets 可能已经是排序过的
    // 但为了保险，我们可以假设 presets 数组的顺序就是当前显示顺序
    // 如果 presets 是按其他方式排序的，这里的逻辑可能需要调整
    // 假设侧边栏总是显示默认排序（按 order）
    
    // 创建副本并重新排序
    const newPresets = [...presets].sort((a, b) => (a.order || 0) - (b.order || 0));
    const fromIndex = newPresets.findIndex(p => p.id === draggingId);
    const toIndex = newPresets.findIndex(p => p.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const [removed] = newPresets.splice(fromIndex, 1);
      
      // 重新计算目标索引
      let finalToIndex = newPresets.findIndex(p => p.id === targetId);
      if (dropPosition === 'after') {
        finalToIndex++;
      }

      newPresets.splice(finalToIndex, 0, removed);

      const reorderedPresets = newPresets.map((preset, index) => ({
        ...preset,
        order: index
      }));

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

  useEffect(() => {
    // 延迟绑定，确保 DOM 已渲染
    const timeout = setTimeout(() => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) {
        console.warn('scrollContainerRef.current is null, retrying...');
        return;
      }

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

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">命令管理</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar" ref={scrollContainerRef}>
          <Link
            to="/"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/") && !isActive("/presets") && !isActive("/history")
                ? "bg-blue-50 text-blue-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <List className="w-5 h-5" />
            <span>命令列表</span>
          </Link>

          <div>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors group cursor-pointer ${
                    isActive("/presets")
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => navigate("/presets")}
                >
                   <div
                      className="flex items-center gap-3 flex-1"
                    >
                      <Bookmark className="w-5 h-5" />
                      <span>命令预设</span>
                    </div>
                  <div 
                    className="p-1 rounded-md hover:bg-black/5 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedPreset(!expandedPreset);
                    }}
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform text-gray-400 group-hover:text-gray-600 ${expandedPreset ? "rotate-90" : ""}`} />
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => setShowAddPresetDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加预设
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            {expandedPreset && presets.length > 0 && (
              <div 
                className={`ml-8 mt-1 space-y-1 transition-all duration-200 ${draggingSource === 'sidebar' ? 'ring-2 ring-blue-500 ring-opacity-50 rounded-lg p-1 bg-blue-50/30' : ''}`}
              >
                {[...presets]
                  .sort((a, b) => {
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
                  })
                  .map((preset) => (
                  <Link
                    key={preset.id}
                    to={`/presets/${preset.id}`}
                    className={`
                      block px-4 py-2 text-sm rounded-lg transition-all duration-200
                      ${location.pathname === `/presets/${preset.id}`
                        ? 'bg-blue-50 text-blue-700 font-medium'  // 选中状态：蓝色背景 + 蓝色文字 + 加粗
                        : 'text-gray-600 hover:bg-gray-100'       // 默认状态：灰色文字 + hover 背景
                      }
                      ${draggingId === preset.id ? 'opacity-50 border border-dashed border-gray-300' : ''}
                      ${dragOverId === preset.id && dropPosition === 'before' ? 'border-t-2 border-t-blue-500 mt-1' : ''}
                      ${dragOverId === preset.id && dropPosition === 'after' ? 'border-b-2 border-b-blue-500 mb-1' : ''}
                    `}
                    draggable={useDefaultSort}
                    onDragStart={(e) => handleDragStart(e, preset.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, preset.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, preset.id)}
                  >
                    {preset.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

           <Link
            to="/history"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/history")
                ? "bg-blue-50 text-blue-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <History className="w-5 h-5" />
            <span>历史命令记录</span>
          </Link>
        </nav>

        {/* 固定在底部的设置按钮 */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
          >
            <SettingsIcon className="w-5 h-5" />
            <span>设置</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>

      {/* 设置对话框 */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      <Dialog open={showAddPresetDialog} onOpenChange={setShowAddPresetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加预设</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="请输入预设名称"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPreset()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPresetDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddPreset}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}