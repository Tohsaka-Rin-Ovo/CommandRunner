import { app, globalShortcut } from 'electron'
import * as DataManager from './dataManager'
import { executor } from './executorService'
import { mainWindow } from './main'
import type { Command, GlobalSettings, Preset, ShortcutBinding } from '@shared/types'

function getWorkingDirectory(settings: GlobalSettings): string {
  return settings.workingDir?.trim() || app.getPath('home')
}

function notifyRenderer(payload: Record<string, unknown>) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('shortcut-execution-started', payload)
  }
}

function executeCommandBinding(binding: ShortcutBinding, settings: GlobalSettings, command: Command) {
  const commandId = `shortcut-command-${command.id}-${Date.now()}`
  notifyRenderer({
    type: 'command',
    commandId,
    command: command.content,
    sourceCommandId: command.id,
  })
  executor.execute(commandId, command.content, getWorkingDirectory(settings), 'external')
}

function executePresetBinding(settings: GlobalSettings, preset: Preset) {
  notifyRenderer({
    type: 'preset',
    presetId: preset.id,
    commandIds: preset.commands.map((command) => command.id),
  })
  void executor.executePreset(
    preset.id,
    preset.commands.map((command) => command.content),
    getWorkingDirectory(settings),
    'external',
  )
}

function handleBinding(binding: ShortcutBinding, settings: GlobalSettings) {
  if (binding.targetType === 'command') {
    const command = DataManager.getCommands().find((item) => item.id === binding.targetId) as Command | undefined
    if (command) {
      executeCommandBinding(binding, settings, command)
    }
    return
  }

  const preset = DataManager.getPresets().find((item) => item.id === binding.targetId) as Preset | undefined
  if (preset) {
    executePresetBinding(settings, preset)
  }
}

export function refreshGlobalShortcuts() {
  globalShortcut.unregisterAll()

  const settings = DataManager.getGlobalSettings() as GlobalSettings
  if (settings.terminalMode !== 'external') {
    return
  }

  for (const binding of settings.shortcutBindings || []) {
    try {
      globalShortcut.register(binding.accelerator, () => handleBinding(binding, settings))
    } catch (error) {
      console.error('[ShortcutManager] Failed to register shortcut:', binding.accelerator, error)
    }
  }
}

export function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll()
}
