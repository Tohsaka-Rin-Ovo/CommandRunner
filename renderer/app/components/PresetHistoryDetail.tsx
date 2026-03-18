import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ChevronLeft, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronRight, Download } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { toast } from 'sonner'
import { usePresetHistoryStore } from '../store/presetHistoryStore'
import type { PresetHistory } from '@shared/types'

const getStatusLabel = (status: 'success' | 'failed' | 'stopped') => {
  if (status === 'success') return '成功'
  if (status === 'failed') return '失败'
  return '已停止'
}

const getStatusBadgeClass = (status: 'success' | 'failed' | 'stopped') => {
  if (status === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'failed') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

const getStatusIconWrapClass = (status: 'success' | 'failed' | 'stopped') => {
  if (status === 'success') return 'bg-emerald-100 text-emerald-600'
  if (status === 'failed') return 'bg-rose-100 text-rose-600'
  return 'bg-amber-100 text-amber-600'
}

export default function PresetHistoryDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const presetHistory = usePresetHistoryStore((state) => state.presetHistory)
  const fetchPresetHistory = usePresetHistoryStore((state) => state.fetchPresetHistory)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const handleScrollRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    fetchPresetHistory()
  }, [fetchPresetHistory])

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

  const historyItem = presetHistory.find(h => h.id === id)
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(new Set())

  if (!historyItem) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">历史记录不存在</p>
        </div>
      </div>
    )
  }

  const toggleExpand = (commandId: string) => {
    const newExpanded = new Set(expandedCommands)
    if (newExpanded.has(commandId)) {
      newExpanded.delete(commandId)
    } else {
      newExpanded.add(commandId)
    }
    setExpandedCommands(newExpanded)
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('已复制到剪贴板')
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('复制失败')
    }
  }

  const handleExport = () => {
    const content = `预设执行历史
==================
预设名称: ${historyItem.presetName}
执行时间: ${new Date(historyItem.startTime).toLocaleString('zh-CN')}
总耗时: ${historyItem.endTime - historyItem.startTime}ms
状态: ${historyItem.status === 'success' ? '成功' : historyItem.status === 'failed' ? '失败' : '已停止'}

命令统计:
- 总命令数: ${historyItem.totalCommands}
- 成功: ${historyItem.successCount}
- 失败: ${historyItem.failedCount}
- 中断: ${historyItem.stoppedCount}

详细命令输出:
${historyItem.commandResults.map((result, index) => `
--- 命令 ${index + 1}: ${result.command}${result.description ? ` (${result.description})` : ''} ---
状态: ${result.status}
耗时: ${result.duration}ms
输出:
${result.output}
`).join('\n')}
`

    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `preset-history-${historyItem.presetName}-${Date.now()}.log`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('导出成功')
    } catch (error) {
      console.error('Failed to export:', error)
      toast.error('导出失败')
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/history')}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-gray-900">预设执行详情</h1>
              <p className="mt-1 text-sm text-gray-500 truncate">查看预设执行结果、统计信息与每条命令的输出明细</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* 主内容 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto p-6 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 概览信息 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-start gap-4 min-w-0">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${getStatusIconWrapClass(historyItem.status)}`}>
                  {historyItem.status === 'success' && <CheckCircle className="w-6 h-6" />}
                  {historyItem.status === 'failed' && <XCircle className="w-6 h-6" />}
                  {historyItem.status === 'stopped' && <AlertCircle className="w-6 h-6" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline">预设历史</Badge>
                    <Badge className={`border ${getStatusBadgeClass(historyItem.status)}`}>
                      {getStatusLabel(historyItem.status)}
                    </Badge>
                  </div>
                  <h4 className="text-base font-semibold text-gray-900 truncate">{historyItem.presetName}</h4>
                  <p className="mt-1 text-sm text-gray-500">{new Date(historyItem.startTime).toLocaleString('zh-CN')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <span className="text-xs text-gray-500">预设名称</span>
                <p className="text-sm font-medium text-gray-900 mt-1">{historyItem.presetName}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">执行时间</span>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {new Date(historyItem.startTime).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">执行状态</span>
                <div className="mt-1">
                  <Badge className={`border ${getStatusBadgeClass(historyItem.status)}`}>
                    {getStatusLabel(historyItem.status)}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">总耗时</span>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {historyItem.endTime - historyItem.startTime}ms
                </p>
              </div>
            </div>
          </div>

          {/* 命令统计 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">命令统计</h4>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="text-xs text-gray-500">总命令数</span>
                <p className="mt-1 text-base font-semibold text-gray-900">{historyItem.totalCommands}</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-700">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>成功</span>
                </div>
                <p className="mt-1 text-base font-semibold">{historyItem.successCount}</p>
              </div>
              <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-rose-700">
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="w-4 h-4" />
                  <span>失败</span>
                </div>
                <p className="mt-1 text-base font-semibold">{historyItem.failedCount}</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-amber-700">
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>中断</span>
                </div>
                <p className="mt-1 text-base font-semibold">{historyItem.stoppedCount}</p>
              </div>
            </div>
          </div>

          {/* 命令详情列表 */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">命令详情</h4>
            {historyItem.commandResults.map((result, index) => (
              <div
                key={result.commandId}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
              >
                {/* 命令头部 */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {/* 序号 */}
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-2 text-xs text-gray-500 font-mono">
                          {(index + 1).toString().padStart(2, '0')}
                        </span>

                        {/* 状态图标 */}
                        {result.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {result.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                        {result.status === 'stopped' && <AlertCircle className="w-4 h-4 text-yellow-500" />}

                        {/* 命令 */}
                        <code className="block truncate rounded-md bg-gray-900 px-3 py-2 text-[12px] font-mono text-green-400">
                          {result.command}
                        </code>
                      </div>

                      {result.description && (
                        <p className="text-sm text-gray-600 ml-8 mt-2">{result.description}</p>
                      )}

                      {/* 耗时 */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 ml-8 mt-2">
                        <span>耗时: {result.duration}ms</span>
                      </div>
                    </div>

                    {/* 展开按钮 */}
                    <button
                      onClick={() => toggleExpand(result.commandId)}
                      className="ml-4 p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {expandedCommands.has(result.commandId) ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 命令输出（可展开） */}
                {expandedCommands.has(result.commandId) && (
                  <div className="border-t border-gray-100">
                    <div className="p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500 font-medium">命令输出</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result.output)}
                        >
                          <span className="text-xs">复制</span>
                        </Button>
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-[200px]">
                        {result.output || '暂无输出'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
