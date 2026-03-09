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
      if (window.electronAPI) {
        const commands = await window.electronAPI.getCommands()
        set({ commands, loading: false })
      } else {
        console.error('electronAPI is not defined')
        set({ loading: false })
      }
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
    // 乐观更新：立即从本地状态中移除，提高响应速度
    set((state) => ({
      commands: state.commands.filter((c) => c.id !== id),
    }))
    
    try {
      await window.electronAPI.deleteCommand(id)
      // 可选：如果后端返回最新的列表，可以再次同步
      // await get().fetchCommands()
    } catch (error) {
      console.error('Failed to delete command:', error)
      // 如果失败，回滚状态（重新拉取）
      await get().fetchCommands()
    }
  },

  reorderCommands: async (commandIds: string[]) => {
    await window.electronAPI.reorderCommands(commandIds)
    await get().fetchCommands()
  },
}))
