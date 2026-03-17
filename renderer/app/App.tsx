import { useEffect, useCallback } from 'react'
import { RouterProvider } from 'react-router'
import { router } from './routes'
import { Toaster } from 'sonner'
import { useCommandStore } from './store/commandStore'
import { usePresetStore } from './store/presetStore'
import { useHistoryStore } from './store/historyStore'
import { usePresetHistoryStore } from './store/presetHistoryStore'
import { useExecutionStore } from './store/executionStore'

function App() {
  const fetchCommands = useCommandStore((state) => state.fetchCommands)
  const fetchPresets = usePresetStore((state) => state.fetchPresets)
  const fetchHistory = useHistoryStore((state) => state.fetchHistory)
  const fetchPresetHistory = usePresetHistoryStore((state) => state.fetchPresetHistory)

  const updateCommandOutput = useExecutionStore((state) => state.updateCommandOutput)
  const completeCommand = useExecutionStore((state) => state.completeCommand)
  const updatePresetProgress = useExecutionStore((state) => state.updatePresetProgress)
  
  const getCommand = useCallback(
    (id: string) => useExecutionStore.getState().activeCommands.get(id),
    [],
  )

  useEffect(() => {
    fetchCommands()
    fetchPresets()
    fetchHistory()
    fetchPresetHistory()
  }, [fetchCommands, fetchPresets, fetchHistory, fetchPresetHistory])

  useEffect(() => {
    if (!window.electronAPI) {
      console.warn('electronAPI is not available, skipping event listeners')
      return
    }

    const cleanupOutput = window.electronAPI.onCommandOutput((data) => {
      updateCommandOutput(data.commandId, data.line, data.type)
    })

    const cleanupComplete = window.electronAPI.onCommandComplete((data) => {
      completeCommand(data.commandId, {
        success: data.success,
        code: data.code,
        output: data.output,
        duration: data.duration,
      })

      const execution = getCommand(data.commandId)
      if (execution) {
        const status: 'success' | 'failed' | 'stopped' = data.success ? 'success' : 'failed'
        const historyItem = {
          command: execution.command,
          commandId: data.commandId,
          status,
          startTime: execution.startTime,
          endTime: Date.now(),
          output: data.output,
        }
        window.electronAPI.addHistory(historyItem)
      }
    })

    const cleanupProgress = window.electronAPI.onPresetProgress((data) => {
      updatePresetProgress(data.presetId, {
        currentIndex: data.currentIndex,
        total: data.total,
        commandId: data.commandId,
        completed: data.completed,
        commandStatus: data.commandStatus,
      })

      // 当预设执行完成时，创建预设历史记录
      if (data.completed && data.presetId) {
        const presets = usePresetStore.getState().presets
        const preset = presets.find(p => p.id === data.presetId)
        const presetExecution = useExecutionStore.getState().activePresets.get(data.presetId)

        if (preset && presetExecution) {
          const commandResults = Object.entries(presetExecution.commands).map(([commandId, execution]) => ({
            commandId,
            command: execution.command,
            description: preset.commands.find(c => c.id === commandId)?.description,
            status: execution.status,
            output: execution.output,
            duration: execution.duration,
          }))

          const historyItem = {
            presetId: data.presetId,
            presetName: preset.name,
            status: presetExecution.overallStatus as 'success' | 'failed' | 'stopped',
            startTime: Math.min(...Object.values(presetExecution.commands).map(cmd => cmd.startTime)),
            endTime: Date.now(),
            totalCommands: preset.commands.length,
            successCount: commandResults.filter(r => r.status === 'success').length,
            failedCount: commandResults.filter(r => r.status === 'failed').length,
            stoppedCount: commandResults.filter(r => r.status === 'stopped').length,
            isFavorite: false,
            commandResults,
          }

          window.electronAPI.addPresetHistory(historyItem)
        }
      }
    })

    return () => {
      cleanupOutput()
      cleanupComplete()
      cleanupProgress()
    }
  }, [updateCommandOutput, completeCommand, updatePresetProgress, getCommand])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster toastOptions={{ duration: 2500 }} />
    </>
  )
}

export default App
