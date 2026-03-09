import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { List, Settings, History, ChevronRight, Plus } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function Root() {
  const location = useLocation();
  const [presetSubmenus, setPresetSubmenus] = useState<string[]>([]);
  const [showAddPresetDialog, setShowAddPresetDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [expandedPreset, setExpandedPreset] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleAddPreset = () => {
    if (newPresetName.trim()) {
      setPresetSubmenus([...presetSubmenus, newPresetName.trim()]);
      setNewPresetName("");
      setShowAddPresetDialog(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧菜单栏 */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">命令管理</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
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
                <div>
                  <button
                    onClick={() => setExpandedPreset(!expandedPreset)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive("/presets")
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5" />
                      <span>命令预设</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${expandedPreset ? "rotate-90" : ""}`} />
                  </button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => setShowAddPresetDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加自定义预设
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            {expandedPreset && presetSubmenus.length > 0 && (
              <div className="ml-8 mt-1 space-y-1">
                {presetSubmenus.map((preset, index) => (
                  <Link
                    key={index}
                    to={`/presets/${preset}`}
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    {preset}
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
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>

      {/* 添加预设对话框 */}
      <Dialog open={showAddPresetDialog} onOpenChange={setShowAddPresetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加自定义预设</DialogTitle>
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