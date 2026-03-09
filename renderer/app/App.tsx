import { useEffect, useCallback } from 'react'
import { RouterProvider } from 'react-router'
import { router } from './routes'
import { useCommandStore } from './store/commandStore'
import { usePresetStore } from './store/presetStore'
import { useHistoryStore } from './store/historyStore'
import { useExecutionStore } from './store/executionStore'

function App() {
  const fetchCommands = useCommandStore((state) => state.fetchCommands)
  const fetchPresets = usePresetStore((state) => state.fetchPresets)
  const fetchHistory = useHistoryStore((state) => state.fetchHistory)

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
  }, [fetchCommands, fetchPresets, fetchHistory])

  useEffect(() => {
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
      })
    })

    return () => {
      cleanupOutput()
      cleanupComplete()
      cleanupProgress()
    }
  }, [updateCommandOutput, completeCommand, updatePresetProgress, getCommand])

  return <RouterProvider router={router} />
}

export default App
