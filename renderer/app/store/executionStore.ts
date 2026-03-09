import { create } from 'zustand'
import type { CommandExecution, PresetExecution } from '@shared/types'

interface ExecutionStore {
  activeCommands: Map<string, CommandExecution>
  activePresets: Map<string, PresetExecution>
  
  startCommand: (id: string, command: string) => void
  updateCommandOutput: (id: string, line: string, type: 'stdout' | 'stderr') => void
  completeCommand: (id: string, result: { success: boolean; code: number | null; output: string; duration: number }) => void
  stopCommand: (id: string) => void
  
  startPreset: (id: string, commandIds: string[]) => void
  updatePresetProgress: (id: string, progress: { currentIndex: number; total: number; commandId: string | null; completed?: boolean }) => void
  stopPreset: (id: string) => void
  
  toggleFullOutput: (id: string) => void
  clearCommandOutput: (id: string) => void
}

export const useExecutionStore = create<ExecutionStore>((set, _get) => ({
  activeCommands: new Map(),
  activePresets: new Map(),

  startCommand: (id: string, command: string) => {
    set((state) => {
      const newCommands = new Map(state.activeCommands)
      newCommands.set(id, {
        id,
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
        execution.status = result.success ? 'success' : 'failed'
        execution.duration = result.duration
        execution.output = result.output
      }
      return { activeCommands: newCommands }
    })
  },

  stopCommand: (id: string) => {
    set((state) => {
      const newCommands = new Map(state.activeCommands)
      const execution = newCommands.get(id)
      if (execution) {
        execution.status = 'stopped'
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
      })
      return { activePresets: newPresets }
    })
  },

  updatePresetProgress: (id: string, progress: { currentIndex: number; total: number; commandId: string | null; completed?: boolean }) => {
    set((state) => {
      const newPresets = new Map(state.activePresets)
      const preset = newPresets.get(id)
      if (preset) {
        preset.currentIndex = progress.currentIndex
        preset.total = progress.total
        if (progress.completed) {
          preset.completed = true
        }
      }
      return { activePresets: newPresets }
    })
  },

  stopPreset: (id: string) => {
    set((state) => {
      const newPresets = new Map(state.activePresets)
      const preset = newPresets.get(id)
      if (preset) {
        preset.stopRequested = true
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
      const execution = newCommands.get(id)
      if (execution) {
        execution.output = ''
        execution.outputLines = []
        execution.displayLines = []
      }
      return { activeCommands: newCommands }
    })
  },
}))
