import { create } from 'zustand'
import type { History } from '@shared/types'

interface HistoryStore {
  history: History[]
  loading: boolean
  fetchHistory: () => Promise<void>
  clearHistory: () => Promise<void>
  deleteHistoryItem: (id: string) => Promise<void>
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  history: [],
  loading: false,

  fetchHistory: async () => {
    set({ loading: true })
    try {
      if (window.electronAPI) {
        const history = await window.electronAPI.getHistory()
        set({ history, loading: false })
      } else {
        console.warn('electronAPI is not defined, skipping fetchHistory')
        set({ loading: false })
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
      set({ loading: false })
    }
  },

  clearHistory: async () => {
    await window.electronAPI.clearHistory()
    await get().fetchHistory()
  },

  deleteHistoryItem: async (id: string) => {
    await window.electronAPI.deleteHistoryItem(id)
    await get().fetchHistory()
  },
}))
