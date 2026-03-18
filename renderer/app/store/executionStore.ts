import { create } from 'zustand'
import type { CommandExecution, PresetExecution } from '@shared/types'

interface ExecutionStore {
  activeCommands: Map<string, CommandExecution>
  activePresets: Map<string, PresetExecution>
  
  startCommand: (id: string, command: string, sourceCommandId?: string) => void
  updateCommandOutput: (id: string, line: string, type: 'stdout' | 'stderr') => void
  completeCommand: (id: string, result: { success: boolean; code: number | null; output: string; duration: number }) => void
  stopCommand: (id: string) => void
  
  startPreset: (id: string, commandIds: string[]) => void
  updatePresetProgress: (id: string, progress: { currentIndex: number; total: number; commandId: string | null; completed?: boolean; commandStatus?: 'success' | 'failed' | 'stopped' }) => void
  updatePresetCommandExecution: (presetId: string, commandId: string, execution: CommandExecution) => void
  stopPreset: (id: string) => void
  resetPresetExecution: (id: string) => void
  
  toggleFullOutput: (id: string) => void
  clearCommandOutput: (id: string) => void
}

export const useExecutionStore = create<ExecutionStore>((set, _get) => ({
  activeCommands: new Map(),
  activePresets: new Map(),

  startCommand: (id: string, command: string, sourceCommandId?: string) => {
    set((state) => {
      const newCommands = new Map(state.activeCommands)
      newCommands.set(id, {
        id,
        sourceCommandId,
        command,
        status: 'running',
        output: '',
        outputLines: [],
        displayLines: [],
        showFull: false,
        duration: 0,
        startTime: Date.now(),
      })
      return { activeCommands: newCommands }
    })
  },

  updateCommandOutput: (id: string, line: string, _type: 'stdout' | 'stderr') => {
    set((state) => {
      const newCommands = new Map(state.activeCommands)
      const execution = newCommands.get(id)
      if (execution) {
        const newOutput = execution.output + line
        const newOutputLines = [...execution.outputLines, line]
        execution.output = newOutput
        execution.outputLines = newOutputLines
        execution.displayLines = execution.showFull ? newOutputLines : newOutputLines.slice(-100)
      }
      return { activeCommands: newCommands }
    })
  },

  completeCommand: (id: string, result: { success: boolean; code: number | null; output: string; duration: number }) => {
    set((state) => {
      const newCommands = new Map(state.activeCommands)
      const execution = newCommands.get(id)
      if (execution) {
        newCommands.set(id, {
          ...execution,
          status: result.success ? 'success' : 'failed',
          duration: result.duration,
          output: result.output,
        })
      }
      return { activeCommands: newCommands }
    })
  },

  stopCommand: (id: string) => {
    set((state) => {
      const newCommands = new Map(state.activeCommands)
      const execution = newCommands.get(id)
      if (execution) {
        newCommands.set(id, {
          ...execution,
          status: 'stopped',
        })
      }
      return { activeCommands: newCommands }
    })
  },

  startPreset: (id: string, commandIds: string[]) => {
    set((state) => {
      const newPresets = new Map(state.activePresets)
      newPresets.set(id, {
        id,
        commands: {},
        currentIndex: 0,
        total: commandIds.length,
        completed: false,
        stopRequested: false,
        overallStatus: 'running',
        failureCount: 0,
      })
      return { activePresets: newPresets }
    })
  },

  updatePresetProgress: (id: string, progress: { currentIndex: number; total: number; commandId: string | null; completed?: boolean; commandStatus?: 'success' | 'failed' | 'stopped' }) => {
    set((state) => {
      const newPresets = new Map(state.activePresets)
      const preset = newPresets.get(id)
      if (preset) {
        const nextPreset = {
          ...preset,
          currentIndex: progress.currentIndex,
          total: progress.total,
        }

        if (progress.commandStatus === 'failed') {
          nextPreset.failureCount += 1
          nextPreset.overallStatus = 'failed'
        } else if (progress.commandStatus === 'stopped') {
          nextPreset.overallStatus = 'stopped'
        }

        if (progress.completed) {
          nextPreset.completed = true
          if (nextPreset.failureCount === 0) {
            nextPreset.overallStatus = 'completed'
          } else {
            nextPreset.overallStatus = 'failed'
          }
        }

        newPresets.set(id, nextPreset)
      }
      return { activePresets: newPresets }
    })
  },

  updatePresetCommandExecution: (presetId: string, commandId: string, execution: CommandExecution) => {
    set((state) => {
      const newPresets = new Map(state.activePresets)
      const preset = newPresets.get(presetId)
      if (preset) {
        newPresets.set(presetId, {
          ...preset,
          commands: {
            ...preset.commands,
            [commandId]: execution,
          },
        })
      }
      return { activePresets: newPresets }
    })
  },

  stopPreset: (id: string) => {
    set((state) => {
      const newPresets = new Map(state.activePresets)
      const preset = newPresets.get(id)
      if (preset) {
        newPresets.set(id, {
          ...preset,
          stopRequested: true,
          overallStatus: 'stopped',
        })
      }
      return { activePresets: newPresets }
    })
  },

  toggleFullOutput: (id: string) => {
    set((state) => {
      const newCommands = new Map(state.activeCommands)
      const execution = newCommands.get(id)
      if (execution) {
        execution.showFull = !execution.showFull
        execution.displayLines = execution.showFull 
          ? execution.outputLines 
          : execution.outputLines.slice(-100)
      }
      return { activeCommands: newCommands }
    })
  },

  clearCommandOutput: (id: string) => {
    set((state) => {
      const newCommands = new Map(state.activeCommands)
      newCommands.delete(id)
      return { activeCommands: newCommands }
    })
  },

  resetPresetExecution: (id: string) => {
    set((state) => {
      const newPresets = new Map(state.activePresets)
      newPresets.delete(id)
      return { activePresets: newPresets }
    })
  },
}))
