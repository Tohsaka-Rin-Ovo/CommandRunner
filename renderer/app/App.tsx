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
  // 初始化主题
  useEffect(() => {
    const theme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const fetchCommands = useCommandStore((state) => state.fetchCommands)
  const fetchPresets = usePresetStore((state) => state.fetchPresets)
  const fetchHistory = useHistoryStore((state) => state.fetchHistory)
  const fetchPresetHistory = usePresetHistoryStore((state) => state.fetchPresetHistory)

  const updateCommandOutput = useExecutionStore((state) => state.updateCommandOutput)
  const completeCommand = useExecutionStore((state) => state.completeCommand)
  const updatePresetProgress = useExecutionStore((state) => state.updatePresetProgress)
  const updatePresetCommandExecution = useExecutionStore((state) => state.updatePresetCommandExecution)
  const startCommand = useExecutionStore((state) => state.startCommand)
  const startPreset = useExecutionStore((state) => state.startPreset)
  const fetchHistoryAfterWrite = useHistoryStore((state) => state.fetchHistory)
  const fetchPresetHistoryAfterWrite = usePresetHistoryStore((state) => state.fetchPresetHistory)
  
  const getCommand = useCallback(
    (id: string) => useExecutionStore.getState().activeCommands.get(id),
    [],
  )

  const buildPresetHistory = useCallback((presetId: string) => {
    const presets = usePresetStore.getState().presets
    const preset = presets.find(p => p.id === presetId)
    const presetExecution = useExecutionStore.getState().activePresets.get(presetId)

    if (!preset || !presetExecution) return null

    const commandResults = preset.commands.map((presetCommand) => {
      const execution = presetExecution.commands[presetCommand.id]
      return {
        commandId: presetCommand.id,
        command: presetCommand.content,
        description: presetCommand.description,
        status: (execution?.status ?? 'stopped') as 'success' | 'failed' | 'stopped',
        output: execution?.output ?? '',
        duration: execution?.duration ?? 0,
      }
    })

    const startTimes = Object.values(presetExecution.commands).map(cmd => cmd.startTime).filter(Boolean)
    const historyStatus: 'success' | 'failed' | 'stopped' = presetExecution.overallStatus === 'completed'
      ? 'success'
      : presetExecution.overallStatus === 'failed'
      ? 'failed'
      : 'stopped'

    return {
      presetId,
      presetName: preset.name,
      status: historyStatus,
      startTime: startTimes.length > 0 ? Math.min(...startTimes) : Date.now(),
      endTime: Date.now(),
      totalCommands: preset.commands.length,
      successCount: commandResults.filter(r => r.status === 'success').length,
      failedCount: commandResults.filter(r => r.status === 'failed').length,
      stoppedCount: commandResults.filter(r => r.status === 'stopped').length,
      isFavorite: false,
      commandResults,
    }
  }, [])

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
      updateCommandOutput(`cmd-${data.commandId}`, data.line, data.type)
    })

    const cleanupComplete = window.electronAPI.onCommandComplete((data) => {
      const executionId = `cmd-${data.commandId}`

      completeCommand(executionId, {
        success: data.success,
        code: data.code,
        output: data.output,
        duration: data.duration,
      })

      const execution = getCommand(executionId)
      if (execution) {
        const presetMatch = data.commandId.match(/^(.*)-(\d+)$/)
        const status: 'success' | 'failed' | 'stopped' = data.success ? 'success' : 'failed'
        if (!presetMatch) {
          const historyItem = {
            command: execution.command,
            commandId: execution.sourceCommandId,
            status,
            startTime: execution.startTime,
            endTime: Date.now(),
            output: data.output,
          }
          window.electronAPI.addHistory(historyItem).then(() => {
            fetchHistoryAfterWrite()
          })
        }

        if (presetMatch) {
          const [, presetId, indexString] = presetMatch
          const index = Number(indexString)
          const preset = usePresetStore.getState().presets.find(p => p.id === presetId)
          const presetCommand = preset?.commands[index]

          if (presetCommand) {
            updatePresetCommandExecution(presetId, presetCommand.id, {
              ...execution,
              status,
              output: data.output,
              duration: data.duration,
            })
          }
        }
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

      if (data.presetId && data.commandStatus === 'stopped') {
        const preset = usePresetStore.getState().presets.find(p => p.id === data.presetId)
        const currentCommand = preset?.commands[data.currentIndex - 1]
        if (currentCommand) {
          updatePresetCommandExecution(data.presetId, currentCommand.id, {
            id: currentCommand.id,
            sourceCommandId: currentCommand.id,
            command: currentCommand.content,
            status: 'stopped',
            output: '',
            outputLines: [],
            displayLines: [],
            showFull: false,
            duration: 0,
            startTime: Date.now(),
          })
        }
      }

      // 当预设执行完成/失败/中断时，创建预设历史记录
      if (data.presetId && (data.completed || data.commandStatus === 'failed' || data.commandStatus === 'stopped')) {
        const historyItem = buildPresetHistory(data.presetId)
        if (historyItem) {
          window.electronAPI.addPresetHistory(historyItem).then(() => {
            fetchPresetHistoryAfterWrite()
          })
        }
      }
    })

    const cleanupShortcutStart = window.electronAPI.onShortcutExecutionStarted
      ? window.electronAPI.onShortcutExecutionStarted((data) => {
          if (data.type === 'command' && data.commandId && data.command) {
            startCommand(`cmd-${data.commandId}`, data.command, data.sourceCommandId)
          }

          if (data.type === 'preset' && data.presetId && data.commandIds) {
            startPreset(data.presetId, data.commandIds)
          }
        })
      : () => {}

    return () => {
      cleanupOutput()
      cleanupComplete()
      cleanupProgress()
      cleanupShortcutStart()
    }
  }, [
    updateCommandOutput,
    completeCommand,
    updatePresetProgress,
    startCommand,
    startPreset,
    getCommand,
    buildPresetHistory,
    updatePresetCommandExecution,
    fetchHistoryAfterWrite,
    fetchPresetHistoryAfterWrite,
  ])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster toastOptions={{ duration: 2500 }} />
    </>
  )
}

export default App
