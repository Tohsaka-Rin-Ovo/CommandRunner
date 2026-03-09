import { create } from 'zustand'
import type { Preset } from '@shared/types'

interface PresetStore {
  presets: Preset[]
  loading: boolean
  expandedPreset: string | null
  fetchPresets: () => Promise<void>
  savePreset: (preset: Preset) => Promise<void>
  updatePreset: (id: string, updates: Partial<Preset>) => Promise<void>
  deletePreset: (id: string) => Promise<void>
  setExpandedPreset: (presetId: string | null) => void
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  presets: [],
  loading: false,
  expandedPreset: null,

  fetchPresets: async () => {
    set({ loading: true })
    try {
      const presets = await window.electronAPI.getPresets()
      set({ presets, loading: false })
    } catch (error) {
      console.error('Failed to fetch presets:', error)
      set({ loading: false })
    }
  },

  savePreset: async (preset: Preset) => {
    await window.electronAPI.savePreset(preset)
    await get().fetchPresets()
  },

  updatePreset: async (id: string, updates: Partial<Preset>) => {
    await window.electronAPI.updatePreset(id, updates)
    await get().fetchPresets()
  },

  deletePreset: async (id: string) => {
    await window.electronAPI.deletePreset(id)
    await get().fetchPresets()
  },

  setExpandedPreset: (presetId: string | null) => {
    set({ expandedPreset: presetId })
  },
}))
