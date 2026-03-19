import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router'
import { AlertCircle, Loader2, Search, X } from 'lucide-react'
import { TaskCard, TaskItem } from './TaskCard'
import { useExecutionStore } from '../store/executionStore'
import { usePresetStore } from '../store/presetStore'
import { useCommandStore } from '../store/commandStore'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Input } from './ui/input'

export default function RunningTasks() {
  const navigate = useNavigate()
  const activeCommands = useExecutionStore((state) => state.activeCommands)
  const activePresets = useExecutionStore((state) => state.activePresets)
  const stopCommand = useExecutionStore((state) => state.stopCommand)
  const stopPreset = useExecutionStore((state) => state.stopPreset)
  const clearCommandOutput = useExecutionStore((state) => state.clearCommandOutput)
  const resetPresetExecution = useExecutionStore((state) => state.resetPresetExecution)
  const presets = usePresetStore((state) => state.presets)
  const commands = useCommandStore((state) => state.commands)
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set())
  const [showCloseInterceptNotice, setShowCloseInterceptNotice] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // 合并所有任务
  const tasks = useMemo(() => {
    const taskList: TaskItem[] = []
    
    // 添加所有命令任务
    activeCommands.forEach((execution, id) => {
      const commandId = execution.sourceCommandId
      const command = commands.find(c => c.id === commandId)
      taskList.push({
        id: id,
        type: 'command',
        status: execution.status,
        name: command?.content || '未知命令',
        description: command?.description,
        startTime: execution.startTime,
        duration: execution.duration,
        commandId: commandId
      })
    })
    
    // 添加所有预设任务
    activePresets.forEach((execution, id) => {
      const preset = presets.find(p => p.id === id)
      taskList.push({
        id: id,
        type: 'preset',
        status: execution.overallStatus,
        name: preset?.name || '未知预设',
        description: preset?.description,
        startTime: Date.now(),
        duration: 0,
        progress: {
          current: execution.currentIndex,
          total: execution.total
        },
        presetId: id
      })
    })
    
    // 排序：正在运行 > 按开始时间降序
    const sortedTasks = taskList.sort((a, b) => {
      const isRunningA = a.status === 'running'
      const isRunningB = b.status === 'running'
      
      if (isRunningA && !isRunningB) return -1
      if (!isRunningA && isRunningB) return 1
      
      return b.startTime - a.startTime
    })

    const keyword = searchQuery.trim().toLowerCase()
    if (!keyword) {
      return sortedTasks
    }

    return sortedTasks.filter((task) =>
      [task.name, task.description || ''].some((value) => value.toLowerCase().includes(keyword))
    )
  }, [activeCommands, activePresets, presets, commands, searchQuery])

  const handleStop = async (id: string, type: 'command' | 'preset') => {
    try {
      if (type === 'command') {
        const backendExecutionId = id.startsWith('cmd-') ? id.slice(4) : id
        await window.electronAPI?.stopCommand(backendExecutionId)
        stopCommand(id)
        toast.success('命令已停止')
      } else {
        await window.electronAPI?.stopPreset(id)
        stopPreset(id)
        toast.success('预设已停止')
      }
    } catch (error) {
      toast.error('停止失败：' + (error as Error).message)
    }
  }

  const handleRemove = (id: string, type: 'command' | 'preset') => {
    try {
      if (type === 'command') {
        clearCommandOutput(id)
        toast.success('已从列表移除')
      } else {
        resetPresetExecution(id)
        toast.success('已从列表移除')
      }
    } catch (error) {
      toast.error('移除失败：' + (error as Error).message)
    }
  }

  const handleClick = (task: TaskItem) => {
    if (task.type === 'command' && task.commandId) {
      // 跳转到命令列表页
      navigate('/')
      // 存储需要展开的命令ID
      sessionStorage.setItem('expandCommandId', task.commandId)
    } else if (task.type === 'preset' && task.presetId) {
      // 跳转到预设详情页
      navigate(`/presets/${task.presetId}`)
    }
  }

  useEffect(() => {
    const shouldHighlight = sessionStorage.getItem('close-intercept-running-highlight')
    const storedTaskIds = sessionStorage.getItem('close-intercept-running-ids')

    if (!shouldHighlight || !storedTaskIds) {
      return
    }

    const parsedIds = storedTaskIds.split(',').filter(Boolean)
    if (parsedIds.length === 0) {
      sessionStorage.removeItem('close-intercept-running-highlight')
      sessionStorage.removeItem('close-intercept-running-ids')
      return
    }

    setHighlightedTaskIds(new Set(parsedIds))
    setShowCloseInterceptNotice(true)
    toast.info('检测到仍有任务在运行，已为您切换到正在运行页面')

    const timeout = window.setTimeout(() => {
      setHighlightedTaskIds(new Set())
      setShowCloseInterceptNotice(false)
    }, 5000)

    sessionStorage.removeItem('close-intercept-running-highlight')
    sessionStorage.removeItem('close-intercept-running-ids')

    return () => {
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (!isSearchOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isSearchOpen])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold text-gray-900">正在运行</h2>
              <div ref={searchContainerRef} className="relative" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`relative h-8 w-8 rounded-full transition-all hover:text-gray-600 hover:bg-gray-100 ${searchQuery.trim() ? 'search-active-pulse bg-blue-50 text-blue-600 ring-1 ring-blue-200 hover:bg-blue-100' : isSearchOpen ? 'bg-gray-100 text-gray-600' : 'text-gray-400'}`}
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  title="搜索运行任务"
                >
                  <Search className="w-4 h-4" />
                  {searchQuery.trim() && (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
                  )}
                </Button>
                {isSearchOpen && (
                  <div className="absolute left-0 top-10 z-20 w-72 rounded-xl border border-gray-200 bg-white p-2.5 shadow-lg">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 w-3.5 h-3.5 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索运行命令或预设..."
                        className="h-9 pl-9 pr-8 text-sm"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          onClick={() => setSearchQuery('')}
                          title="清空搜索"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {searchQuery.trim() && (
                      <p className="mt-2 px-1 text-xs text-gray-500">
                        找到 {tasks.length} 条匹配的运行记录
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-1.5">
              <p className="text-sm text-gray-600">查看和管理所有正在运行的任务</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                  共 {Array.from(activeCommands.values()).length + Array.from(activePresets.values()).length} 条运行记录
                </span>
                {searchQuery.trim() && (
                  <span className="group inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    <span>匹配 {tasks.length} 条结果</span>
                    <button
                      type="button"
                      className="hidden rounded-full p-0.5 text-blue-500 transition-colors hover:bg-blue-200 hover:text-blue-700 group-hover:inline-flex"
                      onClick={() => setSearchQuery('')}
                      title="清空搜索"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto">
        {showCloseInterceptNotice && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800 shadow-sm">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">当前仍有任务处于运行中状态</p>
              <p className="mt-1 text-sm text-blue-700">为避免中断执行，应用已取消关闭并为您切换到这里。蓝色高亮的任务就是当前正在运行的项目。</p>
            </div>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Loader2 className="w-20 h-20 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
              暂无正在运行的任务
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              执行命令后，任务会显示在这里
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onStop={handleStop}
                onClick={handleClick}
                onRemove={handleRemove}
                highlight={highlightedTaskIds.has(task.id) && task.status === 'running'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
