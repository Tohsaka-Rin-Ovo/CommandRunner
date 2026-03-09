import { ipcMain, app } from 'electron'
import * as DataManager from './dataManager'
import { CommandExecutor } from './commandExecutor'

const executor = new CommandExecutor()

export function setupIPCHandlers() {
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
    return DataManager.updatePreset(id, preset)
  })

  ipcMain.handle('delete-preset', async (_event, id) => {
    return DataManager.deletePreset(id)
  })

  // History
  ipcMain.handle('get-history', async () => {
    return DataManager.getHistory()
  })

  ipcMain.handle('clear-history', async () => {
    return DataManager.clearHistory()
  })

  ipcMain.handle('delete-history-item', async (_event, id) => {
    return DataManager.deleteHistoryItem(id)
  })

  // Command Execution
  ipcMain.handle('execute-command', async (_event, command, options) => {
    const commandId = Date.now().toString()
    const workingDir = options?.workingDir || app.getPath('home')
    
    executor.execute(commandId, command, workingDir)
    return commandId
  })

  ipcMain.handle('execute-preset', async (_event, presetId, commandIds) => {
    const commands = DataManager.getPresetCommands(presetId, commandIds)
    return executor.executePreset(presetId, commands, app.getPath('home'))
  })

  ipcMain.handle('stop-command', async (_event, commandId) => {
    return executor.stopCommand(commandId)
  })

  ipcMain.handle('stop-preset', async (_event, presetId) => {
    return executor.stopPreset(presetId)
  })
}
