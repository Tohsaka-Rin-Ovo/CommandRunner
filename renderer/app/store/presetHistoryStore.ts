import { create } from 'zustand'
import type { PresetHistory } from '@shared/types'

interface PresetHistoryStore {
  presetHistory: PresetHistory[]
  loading: boolean
  fetchPresetHistory: () => Promise<void>
  clearPresetHistory: () => Promise<void>
  deletePresetHistoryItem: (id: string) => Promise<boolean>
  togglePresetHistoryFavorite: (id: string) => Promise<boolean>
  getFavoritePresetHistory: () => PresetHistory[]
}

export const usePresetHistoryStore = create<PresetHistoryStore>((set, get) => ({
  presetHistory: [],
  loading: false,

  fetchPresetHistory: async () => {
    set({ loading: true })
    try {
      if (window.electronAPI) {
        const history = await window.electronAPI.getPresetHistory()
        set({ presetHistory: history, loading: false })
      } else {
        console.warn('electronAPI is not defined, skipping fetchPresetHistory')
        set({ loading: false })
      }
    } catch (error) {
      console.error('Failed to fetch preset history:', error)
      set({ loading: false })
    }
  },

  clearPresetHistory: async () => {
    await window.electronAPI.clearPresetHistory()
    await get().fetchPresetHistory()
  },

  deletePresetHistoryItem: async (id: string) => {
    const success = await window.electronAPI.deletePresetHistoryItem(id)
    if (success) {
      await get().fetchPresetHistory()
      return true
    }
    return false
  },

  togglePresetHistoryFavorite: async (id: string) => {
    await window.electronAPI.togglePresetHistoryFavorite(id)
    await get().fetchPresetHistory()
  },

  getFavoritePresetHistory: () => {
    return get().presetHistory.filter(h => h.isFavorite)
  },
}))
