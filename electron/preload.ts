import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Commands
  getCommands: () => ipcRenderer.invoke('get-commands'),
  saveCommand: (command: any) => ipcRenderer.invoke('save-command', command),
  updateCommand: (id: string, command: any) => ipcRenderer.invoke('update-command', id, command),
  deleteCommand: (id: string) => ipcRenderer.invoke('delete-command', id),
  reorderCommands: (commandIds: string[]) => ipcRenderer.invoke('reorder-commands', commandIds),

  // Presets
  getPresets: () => ipcRenderer.invoke('get-presets'),
  savePreset: (preset: any) => ipcRenderer.invoke('save-preset', preset),
  updatePreset: (id: string, preset: any) => ipcRenderer.invoke('update-preset', id, preset),
  deletePreset: (id: string) => ipcRenderer.invoke('delete-preset', id),

  // History
  getHistory: () => ipcRenderer.invoke('get-history'),
  addHistory: (historyItem: any) => ipcRenderer.invoke('add-history', historyItem),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  deleteHistoryItem: (id: string) => ipcRenderer.invoke('delete-history-item', id),

  // Command Execution
  executeCommand: (command: string, options: any) => ipcRenderer.invoke('execute-command', command, options),
  executePreset: (presetId: string, commandIds: string[]) => ipcRenderer.invoke('execute-preset', presetId, commandIds),
  stopCommand: (commandId: string) => ipcRenderer.invoke('stop-command', commandId),
  stopPreset: (presetId: string) => ipcRenderer.invoke('stop-preset', presetId),

  // Events
  onCommandOutput: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data)
    ipcRenderer.on('command-output', listener)
    return () => ipcRenderer.removeListener('command-output', listener)
  },
  onCommandComplete: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data)
    ipcRenderer.on('command-complete', listener)
    return () => ipcRenderer.removeListener('command-complete', listener)
  },
  onPresetProgress: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data)
    ipcRenderer.on('preset-progress', listener)
    return () => ipcRenderer.removeListener('preset-progress', listener)
  },
})
