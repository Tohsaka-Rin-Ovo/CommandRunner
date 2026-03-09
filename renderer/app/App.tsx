import { useEffect } from 'react'
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
  
  const startCommand = useExecutionStore((state) => state.startCommand)
  const updateCommandOutput = useExecutionStore((state) => state.updateCommandOutput)
  const completeCommand = useExecutionStore((state) => state.completeCommand)
  const updatePresetProgress = useExecutionStore((state) => state.updatePresetProgress)

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
  }, [updateCommandOutput, completeCommand, updatePresetProgress])

  return <RouterProvider router={router} />
}

export default App
