import { useRef, useEffect } from 'react'
import { Copy, Save, Trash2, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/button'

interface TerminalOutputProps {
  output: string
  outputLines: string[]
  displayLines: string[]
  showFull: boolean
  status: 'pending' | 'running' | 'success' | 'failed' | 'stopped'
  duration: number
  command: string
  onCopy: () => void
  onSave: () => void
  onClear: () => void
  onClose: () => void
  onToggleFull: () => void
}

export function TerminalOutput({
  output,
  outputLines,
  displayLines,
  showFull,
  status,
  duration,
  command,
  onCopy,
  onSave,
  onClear,
  onClose,
  onToggleFull,
}: TerminalOutputProps) {
  const outputRef = useRef<HTMLDivElement>(null)
  const lastLineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'running' && lastLineRef.current) {
      lastLineRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [displayLines, status])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output)
      onCopy()
    } catch (error) {
      console.error('Failed to copy output:', error)
    }
  }

  const handleSave = async () => {
    try {
      const content = `Command: ${command}\n\n${output}`
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `command-output-${Date.now()}.log`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onSave()
    } catch (error) {
      console.error('Failed to save output:', error)
    }
  }

  const handleClear = () => {
    if (status === 'running') {
      toast.error('执行命令中，请先停止再清空输出')
      return
    }
    onClear()
  }

  const handleClose = () => {
    onClose()
  }

  const getStatusText = () => {
    switch (status) {
      case 'running':
        return '执行中'
      case 'success':
        return '成功'
      case 'failed':
        return '失败'
      case 'stopped':
        return '已停止'
      default:
        return '准备中'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'text-blue-400'
      case 'success':
        return 'text-green-400'
      case 'failed':
        return 'text-red-400'
      case 'stopped':
        return 'text-yellow-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className="terminal-output border border-[#3c3c3c] rounded-lg bg-[#1e1e1e] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#3c3c3c] bg-[#252526]">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">命令执行输出</span>
          {status !== 'pending' && (
            <>
              <span className="text-gray-600">•</span>
              <span className={getStatusColor()}>{getStatusText()}</span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400">{duration}ms</span>
            </>
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1">
          {outputLines.length > 100 && !showFull && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              onClick={onToggleFull}
              title="显示全部输出"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            onClick={handleCopy}
            title="复制输出"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            onClick={handleSave}
            title="保存到文件"
          >
            <Save className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            onClick={handleClear}
            title="清空输出"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            onClick={handleClose}
            title="关闭面板"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Output Content */}
      <div
        ref={outputRef}
        className="output-content p-4 font-mono text-sm leading-relaxed text-[#d4d4d4] overflow-y-auto max-h-96"
        style={{
          fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
          fontSize: '13px',
          lineHeight: '1.6',
        }}
      >
        {displayLines.length === 0 ? (
          <div className="text-gray-500 text-center py-8">暂无输出</div>
        ) : (
          displayLines.map((line, index) => (
            <div key={index} ref={index === displayLines.length - 1 ? lastLineRef : null}>
              {line}
            </div>
          ))
        )}
        {status === 'running' && <div className="animate-pulse">_</div>}
      </div>
    </div>
  )
}
