import { create } from 'zustand'
import type { History } from '@shared/types'

interface HistoryStore {
  history: History[]
  loading: boolean
  fetchHistory: () => Promise<void>
  clearHistory: () => Promise<void>
  deleteHistoryItem: (id: string) => Promise<boolean>
  toggleHistoryFavorite: (id: string) => Promise<boolean>
  cancelAllHistoryFavorites: () => Promise<void>
  getFavoriteHistory: () => History[]
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
    const success = await window.electronAPI.deleteHistoryItem(id)
    if (success) {
      await get().fetchHistory()
      return true
    }
    return false
  },

  toggleHistoryFavorite: async (id: string) => {
    await window.electronAPI.toggleHistoryFavorite(id)
    await get().fetchHistory()
  },

  cancelAllHistoryFavorites: async () => {
    await window.electronAPI.cancelAllHistoryFavorites()
    await get().fetchHistory()
  },

  getFavoriteHistory: () => {
    return get().history.filter(h => h.isFavorite)
  },
}))
