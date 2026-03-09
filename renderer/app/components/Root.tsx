import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { List, Settings, History, ChevronRight, Plus, Trash2 } from "lucide-react";
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
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { usePresetStore } from "../store/presetStore";

export default function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const presets = usePresetStore((state) => state.presets);
  const deletePreset = usePresetStore((state) => state.deletePreset);
  const [expandedPreset, setExpandedPreset] = useState(false);
  const [showAddPresetDialog, setShowAddPresetDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [showDeletePresetDialog, setShowDeletePresetDialog] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);

  const handleAddPreset = () => {
    if (newPresetName.trim()) {
      setShowAddPresetDialog(false);
      navigate("/presets", { state: { newPresetName: newPresetName.trim() } });
      setNewPresetName("");
    }
  };

  const handleDeletePreset = (id: string) => {
    setPresetToDelete(id);
    setShowDeletePresetDialog(true);
  };

  const confirmDeletePreset = async () => {
    if (presetToDelete) {
      await deletePreset(presetToDelete);
      setShowDeletePresetDialog(false);
      setPresetToDelete(null);
    }
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">命令管理</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
                  添加预设
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            {expandedPreset && presets.length > 0 && (
              <div className="ml-8 mt-1 space-y-1">
                {presets.map((preset) => (
                  <ContextMenu key={preset.id}>
                    <ContextMenuTrigger asChild>
                      <Link
                        to="/presets"
                        className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        {preset.name}
                      </Link>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleDeletePreset(preset.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除预设
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
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

      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>

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

      <AlertDialog open={showDeletePresetDialog} onOpenChange={setShowDeletePresetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除这个预设吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除该预设及其包含的所有命令配置。
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