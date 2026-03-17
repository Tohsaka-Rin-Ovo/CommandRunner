import { useNavigate, useParams } from 'react-router'
import { ChevronLeft, CheckCircle, XCircle, AlertCircle, Copy, Download } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { toast } from 'sonner'
import { useHistoryStore } from '../store/historyStore'
import type { History } from '@shared/types'

export default function CommandHistoryDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const history = useHistoryStore((state) => state.history)
  const deleteHistoryItem = useHistoryStore((state) => state.deleteHistoryItem)

  const historyItem = history.find(h => h.id === id)

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(historyItem.output)
      toast.success('已复制到剪贴板')
    } catch (error) {
      console.error('Failed to copy output:', error)
      toast.error('复制失败')
    }
  }

  const handleSave = async () => {
    try {
      const content = `Command: ${historyItem.command}\nStatus: ${historyItem.status}\nDuration: ${historyItem.endTime - historyItem.startTime}ms\n\n${historyItem.output}`
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `command-history-${Date.now()}.log`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('导出成功')
    } catch (error) {
      console.error('Failed to save output:', error)
      toast.error('导出失败')
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/history')}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">单个命令执行详情</h1>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 概览信息 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">执行概览</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500">命令</span>
                <p className="text-sm font-medium text-gray-900 mt-1">{historyItem.command}</p>
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
                  <Badge 
                    variant={historyItem.status === 'success' ? 'default' : 'destructive'}
                  >
                    {historyItem.status === 'success' ? '成功' :
                     historyItem.status === 'failed' ? '失败' :
                     '已停止'}
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

          {/* 命令输出 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">命令输出</h4>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  复制
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出
                </Button>
              </div>
            </div>

            <pre
              className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto font-mono text-sm max-h-[500px]"
              style={{
                fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
                fontSize: '13px',
                lineHeight: '1.6',
              }}
            >
              {historyItem.output || '暂无输出'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
