import type { Command, Preset, History } from '@shared/types'

export interface ElectronAPI {
  // Commands
  getCommands: () => Promise<Command[]>
  saveCommand: (command: Partial<Command> & { id?: string }) => Promise<boolean>
  updateCommand: (id: string, command: Partial<Command>) => Promise<boolean>
  deleteCommand: (id: string) => Promise<boolean>
  reorderCommands: (commandIds: string[]) => Promise<boolean>

  // Presets
  getPresets: () => Promise<Preset[]>
  savePreset: (preset: Preset) => Promise<boolean>
  updatePreset: (id: string, preset: Partial<Preset>) => Promise<boolean>
  deletePreset: (id: string) => Promise<boolean>

  // History
  getHistory: () => Promise<History[]>
  addHistory: (historyItem: Partial<History> & { id?: string }) => Promise<boolean>
  clearHistory: () => Promise<boolean>
  deleteHistoryItem: (id: string) => Promise<boolean>

  // Command Execution
  executeCommand: (command: string, options: any) => Promise<string>
  executePreset: (presetId: string, commandIds: string[]) => Promise<void>
  stopCommand: (commandId: string) => Promise<void>
  stopPreset: (presetId: string) => Promise<void>

  // Settings
  getGlobalSettings: () => Promise<{
    stopOnError: boolean
    showFullOutput: boolean
    confirmBeforeExecute: boolean
  }>

  // Events
  onCommandOutput: (callback: (data: { commandId: string, line: string, type: 'stdout' | 'stderr' }) => void) => () => void
  onCommandComplete: (callback: (data: { commandId: string, success: boolean, code: number | null, output: string, duration: number }) => void) => () => void
  onPresetProgress: (callback: (data: { presetId: string, currentIndex: number, total: number, commandId: string | null, completed?: boolean, commandStatus?: 'success' | 'failed' | 'stopped' }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
