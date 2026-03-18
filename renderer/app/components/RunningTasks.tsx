import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Loader2 } from 'lucide-react'
import { TaskCard, TaskItem } from './TaskCard'
import { useExecutionStore } from '../store/executionStore'
import { usePresetStore } from '../store/presetStore'
import { useCommandStore } from '../store/commandStore'
import { toast } from 'sonner'

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
    return taskList.sort((a, b) => {
      const isRunningA = a.status === 'running'
      const isRunningB = b.status === 'running'
      
      if (isRunningA && !isRunningB) return -1
      if (!isRunningA && isRunningB) return 1
      
      return b.startTime - a.startTime
    })
  }, [activeCommands, activePresets, presets, commands])

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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">正在运行</h2>
        <p className="text-sm text-gray-600 mt-1">
          查看和管理所有正在运行的任务
        </p>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto">
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
