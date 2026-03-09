"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Commands
  getCommands: () => electron.ipcRenderer.invoke("get-commands"),
  saveCommand: (command) => electron.ipcRenderer.invoke("save-command", command),
  updateCommand: (id, command) => electron.ipcRenderer.invoke("update-command", id, command),
  deleteCommand: (id) => electron.ipcRenderer.invoke("delete-command", id),
  reorderCommands: (commandIds) => electron.ipcRenderer.invoke("reorder-commands", commandIds),
  // Presets
  getPresets: () => electron.ipcRenderer.invoke("get-presets"),
  savePreset: (preset) => electron.ipcRenderer.invoke("save-preset", preset),
  updatePreset: (id, preset) => electron.ipcRenderer.invoke("update-preset", id, preset),
  deletePreset: (id) => electron.ipcRenderer.invoke("delete-preset", id),
  // History
  getHistory: () => electron.ipcRenderer.invoke("get-history"),
  clearHistory: () => electron.ipcRenderer.invoke("clear-history"),
  deleteHistoryItem: (id) => electron.ipcRenderer.invoke("delete-history-item", id),
  // Command Execution
  executeCommand: (command, options) => electron.ipcRenderer.invoke("execute-command", command, options),
  executePreset: (presetId, commandIds) => electron.ipcRenderer.invoke("execute-preset", presetId, commandIds),
  stopCommand: (commandId) => electron.ipcRenderer.invoke("stop-command", commandId),
  stopPreset: (presetId) => electron.ipcRenderer.invoke("stop-preset", presetId),
  // Events
  onCommandOutput: (callback) => {
    const listener = (_event, data) => callback(data);
    electron.ipcRenderer.on("command-output", listener);
    return () => electron.ipcRenderer.removeListener("command-output", listener);
  },
  onCommandComplete: (callback) => {
    const listener = (_event, data) => callback(data);
    electron.ipcRenderer.on("command-complete", listener);
    return () => electron.ipcRenderer.removeListener("command-complete", listener);
  },
  onPresetProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    electron.ipcRenderer.on("preset-progress", listener);
    return () => electron.ipcRenderer.removeListener("preset-progress", listener);
  }
});
