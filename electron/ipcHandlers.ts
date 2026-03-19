import { ipcMain, app, dialog, BrowserWindow } from 'electron'
import * as DataManager from './dataManager'
import { executor } from './executorService'
import { refreshGlobalShortcuts } from './shortcutManager'

let mainWindow: BrowserWindow | null = null

export function setIPCMainWindow(window?: BrowserWindow | null) {
  mainWindow = window ?? null
}

export function setupIPCHandlers(window?: BrowserWindow | null) {
  setIPCMainWindow(window)
  // Commands
  ipcMain.handle('get-commands', async () => {
    return DataManager.getCommands()
  })

  ipcMain.handle('save-command', async (_event, command) => {
    return DataManager.saveCommand(command)
  })

  ipcMain.handle('update-command', async (_event, id, command) => {
    return DataManager.updateCommand(id, command)
  })

  ipcMain.handle('delete-command', async (_event, id) => {
    return DataManager.deleteCommand(id)
  })

  ipcMain.handle('reorder-commands', async (_event, commandIds) => {
    return DataManager.reorderCommands(commandIds)
  })

  // Presets
  ipcMain.handle('get-presets', async () => {
    return DataManager.getPresets()
  })

  ipcMain.handle('save-preset', async (_event, preset) => {
    return DataManager.savePreset(preset)
  })

  ipcMain.handle('update-preset', async (_event, id, preset) => {
    console.log('[IPC] update-preset called:', id, preset);

    const result = DataManager.updatePreset(id, preset);
    console.log('[IPC] update-preset result:', result);

    return result;
  })

  ipcMain.handle('delete-preset', async (_event, id) => {
    return DataManager.deletePreset(id)
  })

  // History
  ipcMain.handle('get-history', async () => {
    return DataManager.getHistory()
  })

  ipcMain.handle('add-history', async (_event, historyItem) => {
    return DataManager.addHistory(historyItem)
  })

  ipcMain.handle('clear-history', async () => {
    return DataManager.clearHistory()
  })

  ipcMain.handle('delete-history-item', async (_event, id) => {
    return DataManager.deleteHistoryItem(id)
  })

  // History Favorites
  ipcMain.handle('toggle-history-favorite', async (_event, id) => {
    return DataManager.toggleHistoryFavorite(id)
  })

  ipcMain.handle('get-favorite-history', async () => {
    return DataManager.getFavoriteHistory()
  })

  ipcMain.handle('cancel-all-history-favorites', async () => {
    return DataManager.cancelAllHistoryFavorites()
  })

  // Preset History
  ipcMain.handle('get-preset-history', async () => {
    return DataManager.getPresetHistory()
  })

  ipcMain.handle('add-preset-history', async (_event, historyItem) => {
    return DataManager.addPresetHistory(historyItem)
  })

  ipcMain.handle('clear-preset-history', async () => {
    return DataManager.clearPresetHistory()
  })

  ipcMain.handle('delete-preset-history-item', async (_event, id) => {
    return DataManager.deletePresetHistoryItem(id)
  })

  ipcMain.handle('toggle-preset-history-favorite', async (_event, id) => {
    return DataManager.togglePresetHistoryFavorite(id)
  })

  ipcMain.handle('get-favorite-preset-history', async () => {
    return DataManager.getFavoritePresetHistory()
  })

  ipcMain.handle('cancel-all-preset-history-favorites', async () => {
    return DataManager.cancelAllPresetHistoryFavorites()
  })

  // Command Execution
  ipcMain.handle('execute-command', async (_event, command, options) => {
    const commandId = Date.now().toString()
    const workingDir = options?.workingDir || app.getPath('home')
    const settings = DataManager.getGlobalSettings()
    const terminalMode = settings?.terminalMode || 'internal'

    executor.execute(commandId, command, workingDir, terminalMode)
    return commandId
  })

  ipcMain.handle('execute-preset', async (_event, presetId, commandIds) => {
    const commands = DataManager.getPresetCommands(presetId, commandIds)
    const settings = DataManager.getGlobalSettings()
    const terminalMode = settings?.terminalMode || 'internal'
    return executor.executePreset(presetId, commands, app.getPath('home'), terminalMode)
  })

  ipcMain.handle('stop-command', async (_event, commandId) => {
    return executor.stopCommand(commandId)
  })

  ipcMain.handle('stop-preset', async (_event, presetId) => {
    return executor.stopPreset(presetId)
  })

  ipcMain.handle('mark-all-commands-completed', async () => {
    markAllCommandsAsCompleted(mainWindow)
    return true
  })

  // Global Settings
  ipcMain.handle('get-global-settings', async () => {
    return DataManager.getGlobalSettings()
  })

  ipcMain.handle('save-global-settings', async (_event, settings) => {
    const result = DataManager.saveGlobalSettings(settings)
    if (result) {
      refreshGlobalShortcuts()
    }
    if (result && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-changed')
    }
    return result
  })

  // File Dialog
  ipcMain.handle('select-directory', async (event) => {
    console.log('[IPC] select-directory called')
    console.log('[IPC] Event sender:', event.sender)

    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: '选择工作目录',
      })

      console.log('[IPC] Dialog result:', result)

      if (result.canceled || result.filePaths.length === 0) {
        console.log('[IPC] Dialog canceled or no file selected')
        return null
      }

      console.log('[IPC] Selected directory:', result.filePaths[0])
      return result.filePaths[0]
    } catch (error) {
      console.error('[IPC] Error in select-directory:', error)
      throw error
    }
  })
}
