import { create } from 'zustand'
import type { Command } from '@shared/types'

interface CommandStore {
  commands: Command[]
  loading: boolean
  fetchCommands: () => Promise<void>
  saveCommand: (command: Command) => Promise<void>
  updateCommand: (id: string, updates: Partial<Command>) => Promise<void>
  deleteCommand: (id: string) => Promise<void>
  reorderCommands: (commandIds: string[]) => Promise<void>
}

export const useCommandStore = create<CommandStore>((set, get) => ({
  commands: [],
  loading: false,

  fetchCommands: async () => {
    set({ loading: true })
    try {
      const commands = await window.electronAPI.getCommands()
      set({ commands, loading: false })
    } catch (error) {
      console.error('Failed to fetch commands:', error)
      set({ loading: false })
    }
  },

  saveCommand: async (command: Command) => {
    await window.electronAPI.saveCommand(command)
    await get().fetchCommands()
  },

  updateCommand: async (id: string, updates: Partial<Command>) => {
    await window.electronAPI.updateCommand(id, updates)
    await get().fetchCommands()
  },

  deleteCommand: async (id: string) => {
    await window.electronAPI.deleteCommand(id)
    await get().fetchCommands()
  },

  reorderCommands: async (commandIds: string[]) => {
    await window.electronAPI.reorderCommands(commandIds)
    await get().fetchCommands()
  },
}))
