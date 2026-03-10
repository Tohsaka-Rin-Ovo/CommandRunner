import { create } from 'zustand'
import type { Preset } from '@shared/types'

interface PresetStore {
  presets: Preset[]
  loading: boolean
  expandedPreset: string | null
  sortConfig: {
    sortBy: 'name' | 'createdAt'
    sortOrder: 'asc' | 'desc'
    useDefaultSort: boolean
  }
  draggingSource: 'sidebar' | 'grid' | null
  fetchPresets: () => Promise<void>
  savePreset: (preset: Preset) => Promise<boolean>
  updatePreset: (id: string, updates: Partial<Preset>) => Promise<boolean>
  deletePreset: (id: string) => Promise<boolean>
  reorderPresets: (newOrderPresets: Preset[]) => Promise<boolean>
  setExpandedPreset: (presetId: string | null) => void
  setSortConfig: (config: Partial<PresetStore['sortConfig']>) => void
  setDraggingSource: (source: 'sidebar' | 'grid' | null) => void
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  presets: [],
  loading: false,
  expandedPreset: null,
  draggingSource: null,
  sortConfig: {
    sortBy: 'name',
    sortOrder: 'desc',
    useDefaultSort: true,
  },

  setSortConfig: (config) => {
    set((state) => ({
      sortConfig: { ...state.sortConfig, ...config },
    }))
  },

  setDraggingSource: (source) => {
    set({ draggingSource: source })
  },

  fetchPresets: async () => {
    set({ loading: true })
    try {
      if (window.electronAPI) {
        const presets = await window.electronAPI.getPresets()
        set({ presets, loading: false })
      } else {
        console.warn('electronAPI is not defined, skipping fetchPresets')
        set({ loading: false })
      }
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
    
    // 乐观更新：先更新本地状态
    set((state) => ({
      presets: state.presets.map((p) => 
        p.id === id ? { ...p, ...updates } : p
      ),
    }));

    const result = await window.electronAPI.updatePreset(id, updates);
    console.log('[presetStore] API 返回结果:', result);

    if (!result) {
      console.error('[presetStore] 更新预设失败：API 返回 false');
      // 失败回滚
      await get().fetchPresets();
      return false;
    }

    // 成功后通常不需要重新拉取，除非有其他副作用，但为了保险起见可以拉取
    // 这里我们选择不拉取，依靠乐观更新，除非强制刷新
    // await get().fetchPresets();
    return true;
  },

  reorderPresets: async (newOrderPresets: Preset[]) => {
    // 乐观更新：立即使用新的顺序
    set({ presets: newOrderPresets });

    try {
      // 批量更新后端
      // 由于没有批量接口，只能循环调用，但我们不需要每次都 fetch
      // 注意：这里的 updatePreset 调用不应该触发 fetchPresets，否则会导致闪烁
      // 所以我们直接调用 API，或者复用 updatePreset 但去掉 fetch
      
      const promises = newOrderPresets.map(preset => 
        window.electronAPI.updatePreset(preset.id, { order: preset.order })
      );
      
      await Promise.all(promises);
      
      // 注意：这里不再调用 fetchPresets，以避免因后端写入延迟导致读取到旧数据
      // 从而覆盖了前端的乐观更新结果。
      // 前端的 reorderPresets 已经通过 set({ presets: newOrderPresets }) 保证了 UI 的正确性。
      // 只有在 Promise.all 抛出异常时，我们才会在 catch 中调用 fetchPresets 进行回滚。
      // await get().fetchPresets();
      
      return true;
    } catch (error) {
      console.error('Failed to reorder presets:', error);
      await get().fetchPresets(); // 失败回滚
      return false;
    }
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
