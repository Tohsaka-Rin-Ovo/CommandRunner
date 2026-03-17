import { Copy, Download } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { ScrollArea } from './ui/scroll-area'
import { toast } from 'sonner'

export interface FullOutputContentProps {
  command: string
  output: string
  duration: number
  status: 'success' | 'failed' | 'stopped'
  onCopy?: () => void
  onSave?: () => void
}

export function FullOutputContent({
  command,
  output,
  duration,
  status,
  onCopy,
  onSave,
}: FullOutputContentProps) {
  const handleCopy = async () => {
    if (onCopy) {
      onCopy()
      return
    }
    try {
      await navigator.clipboard.writeText(output)
      toast.success('已复制到剪贴板')
    } catch (error) {
      console.error('Failed to copy output:', error)
      toast.error('复制失败')
    }
  }

  const handleSave = async () => {
    if (onSave) {
      onSave()
      return
    }
    try {
      const content = `Command: ${command}\nStatus: ${status}\nDuration: ${duration}ms\n\n${output}`
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `command-output-${Date.now()}.log`
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
    <ScrollArea className="max-h-[60vh]">
      <div className="p-4">
        <div className="mb-4 pb-4 border-b border-[#3c3c3c]">
          <div className="flex items-center gap-4 text-sm mb-2">
            <span className="text-gray-400">命令:</span>
            <code className="text-[#4ec9b0]">{command}</code>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">状态:</span>
            <span className={status === 'success' ? 'text-green-400' : 'text-red-400'}>
              {status === 'success' ? '成功' : status === 'failed' ? '失败' : '已停止'}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">耗时:</span>
            <span>{duration}ms</span>
          </div>
        </div>

        <pre
          className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-lg overflow-x-auto font-mono text-sm"
          style={{
            fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
            fontSize: '13px',
            lineHeight: '1.6',
          }}
        >
          {output || '暂无输出'}
        </pre>
      </div>
    </ScrollArea>
  )
}

export function FullOutputDialog({
  open,
  onClose,
  command,
  output,
  duration,
  status,
}: {
  open: boolean
  onClose: () => void
  command: string
  output: string
  duration: number
  status: 'success' | 'failed' | 'stopped'
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>完整命令输出</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {}}
              >
                <Copy className="w-4 h-4 mr-2" />
                复制
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {}}
              >
                <Download className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </div>
        </DialogHeader>

        <FullOutputContent
          command={command}
          output={output}
          duration={duration}
          status={status}
        />
      </DialogContent>
    </Dialog>
  )
}
