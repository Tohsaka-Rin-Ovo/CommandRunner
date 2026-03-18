import { Terminal, Bookmark, Square, CheckCircle, XCircle, AlertCircle, RotateCcw, X } from 'lucide-react'
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
}

const isRunning = (status: TaskItem['status']) => {
  return status === 'running'
}

const getStatusColor = (status: TaskItem['status']) => {
  switch (status) {
    case 'running':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'success':
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'stopped':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
  }
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
    return 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10'
  } else if (status === 'success' || status === 'completed') {
    return 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
  } else if (status === 'failed') {
    return 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
  } else if (status === 'stopped') {
    return 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10'
  }
  return 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
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

export function TaskCard({ task, onStop, onClick, onRemove }: TaskCardProps) {
  return (
    <div 
      className={`group p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md relative ${getStatusStyle(task.status)}`}
      onClick={() => onClick(task)}
    >
      {/* 头部：图标 + 名称 + 状态 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {task.type === 'command' ? (
            <Terminal className="w-5 h-5 text-blue-500" />
          ) : (
            <Bookmark className="w-5 h-5 text-purple-500" />
          )}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {task.name}
            </h3>
            {task.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                {task.description}
              </p>
            )}
          </div>
        </div>
        
        {/* 状态标签 */}
        <Badge className={getStatusColor(task.status)}>
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
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>执行进度</span>
            <span>{task.progress.current} / {task.progress.total}</span>
          </div>
          <Progress value={(task.progress.current / task.progress.total) * 100} />
        </div>
      )}
      
      {/* 底部：时长 + 停止/已读按钮 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ⏱️ {formatDuration(task.duration)}
        </span>
        
        <div className="flex items-center gap-2">
          {!isRunning(task.status) && (
            <Button 
              variant="ghost" 
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
