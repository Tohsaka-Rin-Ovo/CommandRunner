import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Search, Star, StarOff, Trash2, CheckCircle, XCircle, AlertCircle, Clock, Download, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog'
import { toast } from 'sonner'
import { useHistoryStore } from '../store/historyStore'
import { usePresetHistoryStore } from '../store/presetHistoryStore'
import type { History, PresetHistory } from '@shared/types'
import { useCommandStore } from '../store/commandStore'

const getHistoryStatusLabel = (status: 'success' | 'failed' | 'stopped') => {
  if (status === 'success') return '成功'
  if (status === 'failed') return '失败'
  return '已停止'
}

const getHistoryStatusBadgeClass = (status: 'success' | 'failed' | 'stopped') => {
  if (status === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'failed') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

const getHistoryStatusIconWrapClass = (status: 'success' | 'failed' | 'stopped') => {
  if (status === 'success') return 'bg-emerald-100 text-emerald-600'
  if (status === 'failed') return 'bg-rose-100 text-rose-600'
  return 'bg-amber-100 text-amber-600'
}

const getHistoryStatusDotClass = (status: 'success' | 'failed' | 'stopped') => {
  if (status === 'success') return 'bg-emerald-500'
  if (status === 'failed') return 'bg-rose-500'
  return 'bg-amber-500'
}

const getHistoryTypeBadgeClass = (type: 'preset' | 'single') => {
  return type === 'preset'
    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
    : 'border-sky-200 bg-sky-50 text-sky-700'
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const history = useHistoryStore((state) => state.history)
  const presetHistory = usePresetHistoryStore((state) => state.presetHistory)
  const deleteHistoryItem = useHistoryStore((state) => state.deleteHistoryItem)
  const toggleHistoryFavorite = useHistoryStore((state) => state.toggleHistoryFavorite)
  const deletePresetHistoryItem = usePresetHistoryStore((state) => state.deletePresetHistoryItem)
  const togglePresetHistoryFavorite = usePresetHistoryStore((state) => state.togglePresetHistoryFavorite)
  const getFavoriteHistory = useHistoryStore((state) => state.getFavoriteHistory)
  const getFavoritePresetHistory = usePresetHistoryStore((state) => state.getFavoritePresetHistory)
  const commands = useCommandStore((state) => state.commands)

  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'time' | 'name'>('time')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'stopped'>('all')
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [showManageFavoritesDialog, setShowManageFavoritesDialog] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const handleScrollRef = useRef<(() => void) | null>(null)

  // 合并所有历史记录
  const allHistory = [
    ...presetHistory.map(h => ({ ...h, type: 'preset' as const })),
    ...history.map(h => ({ ...h, type: 'single' as const }))
  ]

  // 筛选和排序
  const filteredHistory = allHistory.filter(item => {
    // 标签筛选
    if (activeTab === 'preset' && item.type !== 'preset') return false
    if (activeTab === 'single' && item.type !== 'single') return false
    if (activeTab === 'favorites' && !item.isFavorite) return false

    // 状态筛选
    if (statusFilter !== 'all') {
      if (item.status !== statusFilter) return false
    }

    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const command = item.type === 'preset' 
        ? item.presetName 
        : item.command
      const matchesCommand = command.toLowerCase().includes(query)
      const matchesDescription = item.type === 'preset'
        ? item.commandResults.some(r => 
            r.command.toLowerCase().includes(query) || 
            (r.description && r.description.toLowerCase().includes(query))
          )
        : false

      if (!matchesCommand && !matchesDescription) return false
    }

    return true
  })

  // 排序
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    if (sortBy === 'time') {
      const timeA = a.type === 'preset' ? a.startTime : a.startTime
      const timeB = b.type === 'preset' ? b.startTime : b.startTime
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
    } else {
      const nameA = a.type === 'preset' ? a.presetName : a.command
      const nameB = b.type === 'preset' ? b.presetName : b.command
      return sortOrder === 'desc' 
        ? nameB.localeCompare(nameA)
        : nameA.localeCompare(nameB)
    }
  })

  const handleSortBy = (value: 'time' | 'name') => {
    setSortBy(value)
  }

  const handleDelete = async (item: History | PresetHistory, type: string) => {
    if (item.isFavorite) {
      toast.error('收藏的历史记录不能删除')
      return
    }

    let success = false
    if (type === 'preset') {
      success = await deletePresetHistoryItem((item as PresetHistory).id)
    } else {
      success = await deleteHistoryItem((item as History).id)
    }

    if (success) {
      toast.success('历史记录已删除')
    } else {
      toast.error('删除失败')
    }
  }

  const handleToggleFavorite = async (item: History | PresetHistory, type: string) => {
    if (type === 'preset') {
      await togglePresetHistoryFavorite((item as PresetHistory).id)
    } else {
      await toggleHistoryFavorite((item as History).id)
    }
  }

  const handleClearHistory = async () => {
    if (activeTab === 'all' || activeTab === 'favorites') {
      // 清空所有历史
      const { clearHistory } = useHistoryStore.getState()
      const { clearPresetHistory } = usePresetHistoryStore.getState()
      await clearHistory()
      await clearPresetHistory()
      toast.success('所有历史记录已清空')
    } else if (activeTab === 'preset') {
      const { clearPresetHistory } = usePresetHistoryStore.getState()
      await clearPresetHistory()
      toast.success('预设历史记录已清空')
    } else if (activeTab === 'single') {
      const { clearHistory } = useHistoryStore.getState()
      await clearHistory()
      toast.success('单个命令历史记录已清空')
    }
    setShowClearDialog(false)
  }

  const handleManageFavorites = async (action: 'clear' | 'unfavorite') => {
    if (action === 'clear') {
      // 清空收藏记录
      toast.error('暂不支持')
    } else if (action === 'unfavorite') {
      // 取消所有收藏
      const { cancelAllHistoryFavorites } = useHistoryStore.getState()
      const { cancelAllPresetHistoryFavorites } = usePresetHistoryStore.getState()
      await cancelAllHistoryFavorites()
      await cancelAllPresetHistoryFavorites()
      toast.success('已取消所有收藏')
    }
    setShowManageFavoritesDialog(false)
  }

  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportSingleHistory = (item: History) => {
    try {
      const content = `命令历史记录\n==================\n命令: ${item.command}\n状态: ${item.status === 'success' ? '成功' : item.status === 'failed' ? '失败' : '已停止'}\n开始时间: ${new Date(item.startTime).toLocaleString('zh-CN')}\n结束时间: ${new Date(item.endTime).toLocaleString('zh-CN')}\n耗时: ${item.endTime - item.startTime}ms\n\n输出:\n${item.output || '暂无输出'}\n`
      downloadTextFile(content, `command-history-${item.id}.log`)
      toast.success('导出成功')
    } catch (error) {
      console.error('Failed to export single history:', error)
      toast.error('导出失败')
    }
  }

  const handleExportPresetHistory = (item: PresetHistory) => {
    try {
      const content = `预设执行历史\n==================\n预设名称: ${item.presetName}\n状态: ${item.status === 'success' ? '成功' : item.status === 'failed' ? '失败' : '已停止'}\n开始时间: ${new Date(item.startTime).toLocaleString('zh-CN')}\n结束时间: ${new Date(item.endTime).toLocaleString('zh-CN')}\n耗时: ${item.endTime - item.startTime}ms\n\n命令统计:\n- 总命令数: ${item.totalCommands}\n- 成功: ${item.successCount}\n- 失败: ${item.failedCount}\n- 中断: ${item.stoppedCount}\n\n详细命令输出:\n${item.commandResults.map((result, index) => `\n--- 命令 ${index + 1}: ${result.command}${result.description ? ` (${result.description})` : ''} ---\n状态: ${result.status}\n耗时: ${result.duration}ms\n输出:\n${result.output || '暂无输出'}\n`).join('\n')}`
      downloadTextFile(content, `preset-history-${item.id}.log`)
      toast.success('导出成功')
    } catch (error) {
      console.error('Failed to export preset history:', error)
      toast.error('导出失败')
    }
  }

  const getFavoriteCount = () => {
    const singleCount = getFavoriteHistory().length
    const presetCount = getFavoritePresetHistory().length
    return singleCount + presetCount
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="text-blue-600 font-medium">{part}</span>
      ) : part
    )
  }

  // 统计信息
  const stats = {
    all: allHistory.length,
    preset: presetHistory.length,
    single: history.length,
    favorites: getFavoriteCount()
  }

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      scrollContainer.classList.add('scrolling')

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      scrollTimeoutRef.current = setTimeout(() => {
        scrollContainer.classList.remove('scrolling')
      }, 1000)
    }

    handleScrollRef.current = handleScroll
    scrollContainer.addEventListener('scroll', handleScroll)

    return () => {
      const currentContainer = scrollContainerRef.current
      const currentHandler = handleScrollRef.current
      if (currentContainer && currentHandler) {
        currentContainer.removeEventListener('scroll', currentHandler)
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">历史命令</h1>
            <p className="mt-1 text-sm text-gray-500">查看单个命令与命令预设的执行结果、输出和导出记录</p>
          </div>
        </div>
      </div>

      {/* 标签和控制栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* 标签切换 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">全部 ({stats.all})</TabsTrigger>
              <TabsTrigger value="preset">预设命令 ({stats.preset})</TabsTrigger>
              <TabsTrigger value="single">单个命令 ({stats.single})</TabsTrigger>
              <TabsTrigger value="favorites">我的收藏 ({stats.favorites})</TabsTrigger>
            </TabsList>

            {/* 搜索和排序 */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索预设名称、命令内容或命令描述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md p-1">
                <DropdownMenu onOpenChange={setIsSortDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 font-normal">
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
                      <DropdownMenuItem onClick={() => handleSortBy('time')}>
                        按时间排序
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenu>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  title={sortOrder === 'asc' ? '切换为降序' : '切换为升序'}
                >
                  {sortOrder === 'asc' ? (
                    <ArrowUp className="w-3.5 h-3.5 text-gray-500" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </Button>
              </div>

                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md p-1">
                 <DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
                   <DropdownMenuTrigger asChild>
                     <Button variant="ghost" className="h-8 gap-1 px-2 font-normal">
                       <span>{statusFilter === 'all' ? '全部' : statusFilter === 'success' ? '成功' : statusFilter === 'failed' ? '失败' : '已停止'}</span>
                       <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                     </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="w-32">
                     <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                       全部
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setStatusFilter('success')}>
                       <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                       成功
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setStatusFilter('failed')}>
                       <XCircle className="w-4 h-4 mr-2 text-red-600" />
                       失败
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setStatusFilter('stopped')}>
                       <AlertCircle className="w-4 h-4 mr-2 text-yellow-600" />
                       已停止
                     </DropdownMenuItem>
                   </DropdownMenuContent>
                 </DropdownMenu>
               </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清空历史
              </Button>

              {activeTab === 'favorites' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManageFavoritesDialog(true)}
                >
                  <StarOff className="w-4 h-4 mr-2" />
                  管理收藏
                </Button>
              )}
            </div>
          </Tabs>
        </div>
      </div>

      {/* 历史记录列表 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto p-6 custom-scrollbar">
        <div className="max-w-6xl mx-auto">
          {sortedHistory.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-14 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <Clock className="w-7 h-7" />
              </div>
              <p className="text-base font-medium text-gray-700">暂无历史记录</p>
              <p className="mt-2 text-sm text-gray-500">执行命令或预设后，这里会自动保留结果与输出摘要</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedHistory.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    item.isFavorite ? 'border-yellow-300 shadow-yellow-100/70' : 'border-gray-200 shadow-sm'
                  }`}
                >
                  {item.type === 'preset' ? (
                    // 预设历史卡片
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${getHistoryStatusIconWrapClass(item.status)}`}>
                            {item.status === 'success' && <CheckCircle className="w-5 h-5" />}
                            {item.status === 'failed' && <XCircle className="w-5 h-5" />}
                            {item.status === 'stopped' && <AlertCircle className="w-5 h-5" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <Badge className={`border ${getHistoryTypeBadgeClass('preset')}`}>
                                预设
                              </Badge>
                              <Badge className={`border ${getHistoryStatusBadgeClass(item.status)}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${getHistoryStatusDotClass(item.status)}`} />
                                {getHistoryStatusLabel(item.status)}
                              </Badge>
                            </div>
                            <div className="text-[15px] font-semibold text-gray-900 truncate">
                                {highlightText(item.presetName, searchQuery)}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {new Date(item.startTime).toLocaleString('zh-CN')}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFavorite(item, 'preset')}
                          className={item.isFavorite ? 'text-yellow-600' : 'text-gray-400'}
                        >
                          {item.isFavorite ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
                        </Button>
                      </div>

                      <div className="grid gap-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 sm:grid-cols-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-gray-500">命令</span>
                          <span className="font-medium text-gray-900">{item.totalCommands}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-emerald-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>{item.successCount}</span>
                        </div>
                        {item.failedCount > 0 && (
                          <div className="flex items-center gap-2 text-sm text-rose-600">
                            <XCircle className="w-4 h-4" />
                            <span>{item.failedCount}</span>
                          </div>
                        )}
                        {item.stoppedCount > 0 && (
                          <div className="flex items-center gap-2 text-sm text-amber-600">
                            <AlertCircle className="w-4 h-4" />
                            <span>{item.stoppedCount}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{item.endTime - item.startTime}ms</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/history/preset/${item.id}`)}
                        >
                          查看详情
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportPresetHistory(item)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          导出
                        </Button>
                        {!item.isFavorite && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(item, 'preset')}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    // 单个命令历史卡片
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${getHistoryStatusIconWrapClass(item.status)}`}>
                            {item.status === 'success' && <CheckCircle className="w-5 h-5" />}
                            {item.status === 'failed' && <XCircle className="w-5 h-5" />}
                            {item.status === 'stopped' && <AlertCircle className="w-5 h-5" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <Badge className={`border ${getHistoryTypeBadgeClass('single')}`}>
                                单个命令
                              </Badge>
                              <Badge className={`border ${getHistoryStatusBadgeClass(item.status)}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${getHistoryStatusDotClass(item.status)}`} />
                                {getHistoryStatusLabel(item.status)}
                              </Badge>
                            </div>
                            <code className="block truncate rounded-md bg-gray-900 px-3 py-2 text-[12px] font-mono text-green-400">
                                {highlightText(item.command, searchQuery)}
                            </code>
                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                              <span>{new Date(item.startTime).toLocaleString('zh-CN')}</span>
                              <span>耗时: {item.endTime - item.startTime}ms</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFavorite(item, 'single')}
                          className={item.isFavorite ? 'text-yellow-600' : 'text-gray-400'}
                        >
                          {item.isFavorite ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/history/command/${item.id}`)}
                        >
                          查看详情
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportSingleHistory(item)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          导出
                        </Button>
                        {!item.isFavorite && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(item, 'single')}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 清空历史确认对话框 */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空历史</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要清空{activeTab === 'all' ? '所有' : activeTab === 'preset' ? '预设' : activeTab === 'single' ? '单个命令' : '收藏'}历史记录吗？
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearHistory}
              className="bg-red-600 hover:bg-red-700"
            >
              确认清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 管理收藏对话框 */}
      <AlertDialog open={showManageFavoritesDialog} onOpenChange={setShowManageFavoritesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>管理收藏记录</AlertDialogTitle>
            <AlertDialogDescription>
              共有 {stats.favorites} 条收藏的历史记录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleManageFavorites('unfavorite')}
            >
              取消所有收藏
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
