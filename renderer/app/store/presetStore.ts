import { create } from 'zustand'
import type { Preset } from '@shared/types'

interface PresetStore {
  presets: Preset[]
  loading: boolean
  expandedPreset: string | null
  fetchPresets: () => Promise<void>
  savePreset: (preset: Preset) => Promise<boolean>
  updatePreset: (id: string, updates: Partial<Preset>) => Promise<boolean>
  deletePreset: (id: string) => Promise<boolean>
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
    const result = await window.electronAPI.savePreset(preset);
    if (result) {
      await get().fetchPresets();
    }
    return result;
  },

  updatePreset: async (id: string, updates: Partial<Preset>) => {
    console.log('[presetStore] updatePreset called:', id, updates);
    const result = await window.electronAPI.updatePreset(id, updates);
    console.log('[presetStore] API 返回结果:', result);

    if (!result) {
      console.error('[presetStore] 更新预设失败：API 返回 false');
      return false;
    }

    await get().fetchPresets();
    console.log('[presetStore] 刷新预设列表完成');
    return true;
  },

  deletePreset: async (id: string) => {
    console.log('[presetStore] deletePreset called:', id);

    // 乐观更新：立即从本地状态中移除
    set((state) => ({
      presets: state.presets.filter((p) => p.id !== id),
    }))

    try {
      if (window.electronAPI) {
        console.log('[presetStore] 调用 electronAPI.deletePreset:', id);
        const result = await window.electronAPI.deletePreset(id);
        console.log('[presetStore] electronAPI.deletePreset 返回结果:', result);

        if (!result) {
          console.error('[presetStore] 删除预设失败：API 返回 false');
          // 如果后端返回失败，重新拉取以回滚
          await get().fetchPresets();
          return false;
        }
        console.log('[presetStore] 删除预设成功');
        return true;
      } else {
        console.error('[presetStore] electronAPI is not defined');
        return false;
      }
    } catch (error) {
      console.error('[presetStore] 删除预设异常:', error);
      // 发生异常，回滚状态
      await get().fetchPresets();
      return false;
    }
  },

  setExpandedPreset: (presetId: string | null) => {
    set({ expandedPreset: presetId })
  },
}))
