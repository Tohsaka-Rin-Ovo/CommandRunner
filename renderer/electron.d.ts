import type { Command, Preset, History, PresetHistory, GlobalSettings } from '@shared/types'

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

  // History Favorites
  toggleHistoryFavorite: (id: string) => Promise<boolean>
  getFavoriteHistory: () => Promise<History[]>
  cancelAllHistoryFavorites: () => Promise<boolean>

  // Preset History
  getPresetHistory: () => Promise<PresetHistory[]>
  addPresetHistory: (historyItem: Partial<PresetHistory> & { id?: string }) => Promise<boolean>
  clearPresetHistory: () => Promise<boolean>
  deletePresetHistoryItem: (id: string) => Promise<boolean>
  togglePresetHistoryFavorite: (id: string) => Promise<boolean>
  getFavoritePresetHistory: () => Promise<PresetHistory[]>
  cancelAllPresetHistoryFavorites: () => Promise<boolean>

  // Command Execution
  executeCommand: (command: string, options: any) => Promise<string>
  executePreset: (presetId: string, commandIds: string[]) => Promise<void>
  stopCommand: (commandId: string) => Promise<void>
  stopPreset: (presetId: string) => Promise<void>

  // File Dialog
  selectDirectory: () => Promise<string | null>

  // Settings
  getGlobalSettings: () => Promise<GlobalSettings>
  saveGlobalSettings: (settings: GlobalSettings) => Promise<void>

  // Events
  onCommandOutput: (callback: (data: { commandId: string, line: string, type: 'stdout' | 'stderr' }) => void) => () => void
  onCommandComplete: (callback: (data: { commandId: string, success: boolean, code: number | null, output: string, duration: number }) => void) => () => void
  onPresetProgress: (callback: (data: { presetId: string, currentIndex: number, total: number, commandId: string | null, completed?: boolean, commandStatus?: 'success' | 'failed' | 'stopped' }) => void) => () => void
  onShortcutExecutionStarted: (callback: (data: { type: 'command' | 'preset', commandId?: string, command?: string, sourceCommandId?: string, presetId?: string, commandIds?: string[] }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
