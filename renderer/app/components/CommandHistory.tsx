import { useState, useEffect } from "react";
import { Clock, Trash2, Search, RotateCcw, CheckCircle, XCircle, AlertCircle, FileText, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination";
import { useHistoryStore } from "../store/historyStore";
import type { History as HistoryType } from "@shared/types";

export default function CommandHistory() {
  const history = useHistoryStore((state) => state.history);
  const loading = useHistoryStore((state) => state.loading);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);
  const clearHistory = useHistoryStore((state) => state.clearHistory);
  const deleteHistoryItem = useHistoryStore((state) => state.deleteHistoryItem);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed" | "stopped">("all");
  const [showFullOutputDialog, setShowFullOutputDialog] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryType | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.output.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentHistory = filteredHistory.slice(startIndex, endIndex);

  const handleReExecute = async (historyItem: HistoryType) => {
    const command = historyItem.command;
    await window.electronAPI.executeCommand(command, {});
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("确定要删除这条历史记录吗？")) {
      await deleteHistoryItem(id);
    }
  };

  const handleClearAll = async () => {
    await clearHistory();
    setShowClearDialog(false);
    setSelectedItems(new Set()); // 清空选中项
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`确定要删除选中的 ${selectedItems.size} 条历史记录吗？`)) {
      for (const id of selectedItems) {
        await deleteHistoryItem(id);
      }
      setSelectedItems(new Set()); // 清空选中项
      fetchHistory(); // 刷新列表
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === currentHistory.length) {
      setSelectedItems(new Set());
    } else {
      const allIds = new Set(currentHistory.map((item) => item.id));
      setSelectedItems(allIds);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (startTime: number, endTime: number) => {
    const duration = endTime - startTime;
    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(duration / 60000);
      const seconds = ((duration % 60000) / 1000).toFixed(2);
      return `${minutes}m ${seconds}s`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "stopped":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "success":
        return "成功";
      case "failed":
        return "失败";
      case "stopped":
        return "已停止";
      default:
        return "未知";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-700";
      case "failed":
        return "bg-red-100 text-red-700";
      case "stopped":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">历史命令记录</h2>
            <p className="text-sm text-gray-600 mt-1">查看最近执行的命令历史</p>
          </div>
          <Button variant="outline" onClick={() => setShowClearDialog(true)}>
            <Trash2 className="w-4 h-4 mr-1" />
            清空历史
          </Button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索命令或输出内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              全部
            </Button>
            <Button
              variant={statusFilter === "success" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("success")}
              className="text-green-700"
            >
              成功
            </Button>
            <Button
              variant={statusFilter === "failed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("failed")}
              className="text-red-700"
            >
              失败
            </Button>
            <Button
              variant={statusFilter === "stopped" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("stopped")}
              className="text-yellow-700"
            >
              已停止
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Clock className="w-12 h-12 mb-4 opacity-50" />
            <p>暂无历史记录</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-3">
            <div className="flex items-center gap-2 mb-2 pl-4">
              <Checkbox
                id="select-all"
                checked={selectedItems.size === currentHistory.length && currentHistory.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                全选当前页
              </label>
            </div>
            {currentHistory.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex items-center gap-4 p-4"
              >
                <Checkbox
                  checked={selectedItems.has(item.id)}
                  onCheckedChange={() => toggleSelectItem(item.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(item.status)}
                        <code className="flex-1 font-mono text-sm bg-gray-900 text-green-400 px-4 py-3 rounded overflow-x-auto">
                          {item.command}
                        </code>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(item.startTime)}</span>
                        </div>
                        {item.endTime && (
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{formatDuration(item.startTime, item.endTime)}</span>
                          </div>
                        )}
                        <Badge className={getStatusColor(item.status)}>
                          {getStatusText(item.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleReExecute(item)}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setSelectedHistory(item);
                          setShowFullOutputDialog(true);
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage((prev) => Math.max(prev - 1, 1));
                  }}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">{currentPage}</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                  }}
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>清空历史记录</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-gray-600">
            确定要清空所有历史记录吗？此操作无法撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleClearAll}>
              确认清空
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFullOutputDialog} onOpenChange={setShowFullOutputDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>命令输出</DialogTitle>
          </DialogHeader>
          {selectedHistory && (
            <div className="py-4">
              <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(selectedHistory.status)}
                  <code className="font-mono text-sm">{selectedHistory.command}</code>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{formatDate(selectedHistory.startTime)}</span>
                  <span>{formatDuration(selectedHistory.startTime, selectedHistory.endTime)}</span>
                </div>
              </div>
              <div className="bg-[#1e1e1e] rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="font-mono text-sm text-[#d4d4d4] whitespace-pre-wrap">
                  {selectedHistory.output || "无输出"}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowFullOutputDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
