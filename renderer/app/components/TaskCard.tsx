import { Terminal, Bookmark, Square, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'

export interface TaskItem {
  id: string
  type: 'command' | 'preset'
  status: 'pending' | 'running' | 'success' | 'failed' | 'stopped' | 'idle' | 'completed'
  name: string
  description?: string
  startTime: number
  duration: number
  commandId?: string
  presetId?: string
  progress?: {
    current: number
    total: number
  }
}

interface TaskCardProps {
  task: TaskItem
  onStop: (id: string, type: 'command' | 'preset') => void
  onClick: (task: TaskItem) => void
  onRemove: (id: string, type: 'command' | 'preset') => void
  highlight?: boolean
}

const isRunning = (status: TaskItem['status']) => {
  return status === 'running'
}

const getStatusColor = (status: TaskItem['status']) => {
  switch (status) {
    case 'running':
      return 'border-blue-200 bg-blue-50/80 text-blue-700'
    case 'success':
    case 'completed':
      return 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
    case 'failed':
      return 'border-rose-200 bg-rose-50/80 text-rose-700'
    case 'stopped':
      return 'border-amber-200 bg-amber-50/80 text-amber-700'
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700'
  }
}

const getStatusAccent = (status: TaskItem['status']) => {
  switch (status) {
    case 'running':
      return 'bg-blue-500'
    case 'success':
    case 'completed':
      return 'bg-emerald-500'
    case 'failed':
      return 'bg-rose-500'
    case 'stopped':
      return 'bg-amber-500'
    default:
      return 'bg-gray-300'
  }
}

const getTypeIconStyle = (task: TaskItem) => {
  switch (task.status) {
    case 'running':
      return 'bg-blue-100 text-blue-600'
    case 'success':
    case 'completed':
      return 'bg-emerald-100 text-emerald-600'
    case 'failed':
      return 'bg-rose-100 text-rose-600'
    case 'stopped':
      return 'bg-amber-100 text-amber-600'
    default:
      return task.type === 'command'
        ? 'bg-slate-100 text-slate-600'
        : 'bg-indigo-100 text-indigo-600'
  }
}

const getTypeText = (task: TaskItem) => {
  return task.type === 'command' ? '单条命令' : '命令预设'
}

const getStatusText = (status: TaskItem['status']) => {
  switch (status) {
    case 'pending':
      return '等待中'
    case 'running':
      return '执行中'
    case 'success':
      return '成功'
    case 'failed':
      return '失败'
    case 'stopped':
      return '已停止'
    case 'idle':
      return '空闲'
    case 'completed':
      return '完成'
    default:
      return '未知'
  }
}

const getStatusStyle = (status: TaskItem['status']) => {
  if (status === 'running') {
    return 'border-gray-200 shadow-blue-100/40'
  } else if (status === 'success' || status === 'completed') {
    return 'border-gray-200 shadow-emerald-100/40'
  } else if (status === 'failed') {
    return 'border-gray-200 shadow-rose-100/40'
  } else if (status === 'stopped') {
    return 'border-gray-200 shadow-amber-100/40'
  }
  return 'border-gray-200 shadow-black/5'
}

const formatDuration = (duration: number) => {
  if (duration < 1000) {
    return `${duration}ms`
  } else if (duration < 60000) {
    return `${Math.floor(duration / 1000)}秒`
  } else {
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return `${minutes}分${seconds}秒`
  }
}

export function TaskCard({ task, onStop, onClick, onRemove, highlight = false }: TaskCardProps) {
  const isCommand = task.type === 'command'

  return (
    <div 
      className={`group relative overflow-hidden rounded-xl border bg-white p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${getStatusStyle(task.status)} ${highlight ? 'ring-2 ring-blue-200 border-blue-300 bg-blue-50/40 shadow-blue-100/60' : ''}`}
      onClick={() => onClick(task)}
    >
      {highlight && (
        <div className="pointer-events-none absolute inset-0 animate-pulse rounded-xl border border-blue-300/70" />
      )}
      {/* 头部：图标 + 名称 + 状态 */}
      <div className="mb-3 flex items-start justify-between gap-3 pl-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${getTypeIconStyle(task)}`}>
            {task.type === 'command' ? (
              <Terminal className="w-5 h-5" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="mb-1.5 flex items-center gap-2 min-w-0">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                {getTypeText(task)}
              </span>
            </div>

            {isCommand ? (
              <>
                <code className="block truncate rounded-md bg-gray-900 px-3 py-2 text-[12px] text-green-400 font-mono leading-relaxed">
                  {task.name}
                </code>
                {task.description && (
                  <p className="mt-2 line-clamp-1 text-sm text-gray-500">
                    {task.description}
                  </p>
                )}
              </>
            ) : (
              <>
                <h3 className="truncate text-[15px] font-semibold text-gray-900">
                  {task.name}
                </h3>
                {task.description && (
                  <p className="mt-1 line-clamp-1 text-sm text-gray-500">
                    {task.description}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* 状态标签 */}
        <Badge className={`shrink-0 border px-2.5 py-1 text-[11px] font-medium ${getStatusColor(task.status)}`}>
          <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${getStatusAccent(task.status)}`} />
          {task.status === 'running' ? (
            <RotateCcw className="w-3 h-3 mr-1 animate-spin" />
          ) : task.status === 'success' || task.status === 'completed' ? (
            <CheckCircle className="w-3 h-3 mr-1" />
          ) : task.status === 'failed' ? (
            <XCircle className="w-3 h-3 mr-1" />
          ) : task.status === 'stopped' ? (
            <AlertCircle className="w-3 h-3 mr-1" />
          ) : null}
          {getStatusText(task.status)}
        </Badge>
      </div>
      
      {/* 进度信息（仅预设） */}
      {task.type === 'preset' && task.progress && isRunning(task.status) && (
        <div className="mb-4 ml-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
            <span>执行进度</span>
            <span>{task.progress.current} / {task.progress.total}</span>
          </div>
          <Progress value={(task.progress.current / task.progress.total) * 100} />
        </div>
      )}

      {task.type === 'preset' && !isRunning(task.status) && task.progress && (
        <div className="mb-4 ml-2 flex items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-gray-100 px-2 py-1">
            共 {task.progress.total} 条命令
          </span>
        </div>
      )}
      
      {/* 底部：时长 + 停止/已读按钮 */}
      <div className="ml-2 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-sm text-gray-500">
          ⏱️ {formatDuration(task.duration)}
        </span>
        
        <div className="flex items-center gap-2">
          {!isRunning(task.status) && (
            <Button 
              variant="ghost" 
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(task.id, task.type)
              }}
              title="已读并移除"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              已读
            </Button>
          )}
          
          {isRunning(task.status) && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onStop(task.id, task.type)
              }}
            >
              <Square className="w-4 h-4 mr-2" />
              停止
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
