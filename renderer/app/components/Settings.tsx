import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronDown, Save, FolderOpen, Play, FolderOpen as FolderIcon, Edit3, Info, Moon, Sun, Keyboard, Trash2, Check, Plus } from 'lucide-react'
import { Button } from './ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { toast } from 'sonner'
import type { Command, GlobalSettings, Preset, ShortcutBinding, ShortcutBindingTargetType } from '@shared/types'

interface SettingsProps {
  onClose: () => void
}

type SectionId = 'appearance' | 'execution' | 'directory' | 'editor' | 'about' | 'hotkeys'

interface Section {
  id: SectionId
  title: string
  icon: React.ReactNode
}

const sections: Section[] = [
  { id: 'execution', title: '执行设置', icon: <Play className="w-5 h-5" /> },
  { id: 'hotkeys', title: '快捷键绑定', icon: <Keyboard className="w-5 h-5" /> },
  { id: 'directory', title: '工作目录', icon: <FolderIcon className="w-5 h-5" /> },
  { id: 'editor', title: '编辑器设置', icon: <Edit3 className="w-5 h-5" /> },
  { id: 'appearance', title: '外观设置', icon: <Moon className="w-5 h-5" /> },
  { id: 'about', title: '关于', icon: <Info className="w-5 h-5" /> },
]

function normalizeShortcut(event: KeyboardEvent): { accelerator: string; displayLabel: string } | null {
  const key = event.key
  const upperKey = key.toUpperCase()
  const isLetter = /^[A-Z]$/.test(upperKey)
  const isDigit = /^[0-9]$/.test(key)
  const isFunctionKey = /^F\d{1,2}$/i.test(key)
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    Spacebar: 'Space',
    Enter: 'Enter',
    Tab: 'Tab',
    Escape: 'Escape',
    Delete: 'Delete',
    Backspace: 'Backspace',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
  }

  const normalizedKey = isLetter
    ? upperKey
    : isDigit
      ? key
      : isFunctionKey
        ? upperKey
        : keyMap[key]

  if (!normalizedKey) return null

  const modifiers: string[] = []
  const labels: string[] = []

  if (event.ctrlKey || event.metaKey) {
    modifiers.push('CommandOrControl')
    labels.push('Ctrl')
  }
  if (event.altKey) {
    modifiers.push('Alt')
    labels.push('Alt')
  }
  if (event.shiftKey) {
    modifiers.push('Shift')
    labels.push('Shift')
  }

  if (modifiers.length === 0) return null

  return {
    accelerator: [...modifiers, normalizedKey].join('+'),
    displayLabel: [...labels, normalizedKey].join(' + '),
  }
}

export default function Settings({ onClose }: SettingsProps) {
  const defaultSettings: GlobalSettings = {
    theme: 'light' as 'light' | 'dark',
    stopOnError: false,
    showFullOutput: true,
    confirmBeforeExecute: false,
    preserveSearchOnNavigation: false,
    preservePageOnNavigation: false,
    workingDir: '',
    editorCommand: '',
    terminalMode: 'external' as 'internal' | 'external',
    shortcutBindings: [],
  }

  const [commands, setCommands] = useState<Command[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [bindingDraft, setBindingDraft] = useState<{
    targetType: ShortcutBindingTargetType
    targetId: string
    accelerator: string
    displayLabel: string
  }>({
    targetType: 'command',
    targetId: '',
    accelerator: '',
    displayLabel: '',
  })
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false)

  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    ...defaultSettings,
  })
  const [savedSettings, setSavedSettings] = useState<GlobalSettings>({
    ...defaultSettings,
  })
  const [activeSection, setActiveSection] = useState<SectionId>('execution')
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [showAddBindingDialog, setShowAddBindingDialog] = useState(false)
  const contentScrollRef = useRef<HTMLDivElement>(null)

  const hasUnsavedChanges = JSON.stringify(globalSettings) !== JSON.stringify(savedSettings)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (window.electronAPI?.getGlobalSettings) {
          const [settings, nextCommands, nextPresets] = await Promise.all([
            window.electronAPI.getGlobalSettings(),
            window.electronAPI.getCommands(),
            window.electronAPI.getPresets(),
          ])
          const mergedSettings = { ...defaultSettings, ...settings }
          setGlobalSettings(mergedSettings)
          setSavedSettings(mergedSettings)
          setCommands(nextCommands)
          setPresets(nextPresets)
        } else {
          // 如果 electronAPI 不可用，从 localStorage 读取
          const savedSettings = localStorage.getItem('globalSettings')
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings)
            const mergedSettings = { ...defaultSettings, ...parsed }
            setGlobalSettings(mergedSettings)
            setSavedSettings(mergedSettings)
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    if (bindingDraft.targetType === 'command') {
      const hasTarget = commands.some((command) => command.id === bindingDraft.targetId)
      if (!hasTarget) {
        setBindingDraft((prev) => ({
          ...prev,
          targetId: commands[0]?.id || '',
        }))
      }
      return
    }

    const hasTarget = presets.some((preset) => preset.id === bindingDraft.targetId)
    if (!hasTarget) {
      setBindingDraft((prev) => ({
        ...prev,
        targetId: presets[0]?.id || '',
      }))
    }
  }, [bindingDraft.targetType, bindingDraft.targetId, commands, presets])

  useEffect(() => {
    if (!isRecordingShortcut) return

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        setIsRecordingShortcut(false)
        return
      }

      const normalized = normalizeShortcut(event)
      if (!normalized) {
        toast.error('请至少使用一个修饰键，例如 Ctrl、Alt 或 Shift')
        return
      }

      setBindingDraft((prev) => ({
        ...prev,
        accelerator: normalized.accelerator,
        displayLabel: normalized.displayLabel,
      }))
      setIsRecordingShortcut(false)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isRecordingShortcut])

  useEffect(() => {
    // 应用主题到 document
    if (globalSettings.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    // 保存主题到 localStorage（即时生效）
    localStorage.setItem('theme', globalSettings.theme)
  }, [globalSettings.theme])

  const availableCommandBindings = globalSettings.shortcutBindings.filter((binding) => binding.targetType === 'command')
  const availablePresetBindings = globalSettings.shortcutBindings.filter((binding) => binding.targetType === 'preset')

  const commandOptions = commands.map((command) => ({
    id: command.id,
    label: command.description?.trim() || command.content,
    subLabel: command.content,
  }))

  const presetOptions = presets.map((preset) => ({
    id: preset.id,
    label: preset.name,
    subLabel: preset.description?.trim() || `${preset.commands.length} 个命令`,
  }))

  const currentBindingOptions = bindingDraft.targetType === 'command' ? commandOptions : presetOptions
  const selectedPreset = bindingDraft.targetType === 'preset'
    ? presets.find((preset) => preset.id === bindingDraft.targetId)
    : null

  const getBindingTargetLabel = (binding: ShortcutBinding) => {
    if (binding.targetType === 'command') {
      const command = commands.find((item) => item.id === binding.targetId)
      return command?.description?.trim() || command?.content || '已删除的命令'
    }

    const preset = presets.find((item) => item.id === binding.targetId)
    return preset?.name || '已删除的预设'
  }

  const handleAddShortcutBinding = () => {
    if (!bindingDraft.targetId) {
      toast.error('请先选择要绑定的命令或预设')
      return
    }

    if (!bindingDraft.accelerator || !bindingDraft.displayLabel) {
      toast.error('请先录入快捷键')
      return
    }

    const duplicateAccelerator = globalSettings.shortcutBindings.find(
      (binding) => binding.accelerator === bindingDraft.accelerator && binding.targetId !== bindingDraft.targetId,
    )
    if (duplicateAccelerator) {
      toast.error(`快捷键 ${bindingDraft.displayLabel} 已被占用`)
      return
    }

    const nextBinding: ShortcutBinding = {
      id: `${bindingDraft.targetType}-${bindingDraft.targetId}`,
      targetType: bindingDraft.targetType,
      targetId: bindingDraft.targetId,
      accelerator: bindingDraft.accelerator,
      displayLabel: bindingDraft.displayLabel,
    }

    setGlobalSettings((prev) => {
      const remaining = prev.shortcutBindings.filter((binding) => binding.id !== nextBinding.id)
      return {
        ...prev,
        shortcutBindings: [...remaining, nextBinding],
      }
    })

    setBindingDraft((prev) => ({
      ...prev,
      accelerator: '',
      displayLabel: '',
    }))
    setShowAddBindingDialog(false)
    toast.success('快捷键绑定已加入待保存列表')
  }

  const handleRemoveShortcutBinding = (bindingId: string) => {
    setGlobalSettings((prev) => ({
      ...prev,
      shortcutBindings: prev.shortcutBindings.filter((binding) => binding.id !== bindingId),
    }))
  }

  const handleSelectDirectory = async () => {
    try {
      const dir = await window.electronAPI?.selectDirectory()
      if (dir) {
        setGlobalSettings({ ...globalSettings, workingDir: dir })
      }
    } catch (error) {
      toast.error('选择文件夹失败')
    }
  }

  const handleSave = () => {
    try {
      if (window.electronAPI?.saveGlobalSettings) {
        window.electronAPI.saveGlobalSettings(globalSettings)
      } else {
        localStorage.setItem('globalSettings', JSON.stringify(globalSettings))
      }
      setSavedSettings(globalSettings)
      setJustSaved(true)
      window.dispatchEvent(new Event('settings-changed'))
      toast.success('设置已保存')
    } catch (error) {
      toast.error('保存设置失败')
    }
  }

  useEffect(() => {
    if (!justSaved) return

    const timeout = window.setTimeout(() => {
      setJustSaved(false)
    }, 1800)

    return () => window.clearTimeout(timeout)
  }, [justSaved])

  const scrollToSection = (sectionId: SectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(sectionId)
    }
  }

  const handleTopBack = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true)
      return
    }

    onClose()
  }

  useEffect(() => {
    const container = contentScrollRef.current
    if (!container) return

    const sectionIds = sections.map(section => section.id)

    const updateActiveSection = () => {
      const containerTop = container.getBoundingClientRect().top

      let currentSection: SectionId = sectionIds[0]
      let minDistance = Number.POSITIVE_INFINITY

      for (const sectionId of sectionIds) {
        const element = document.getElementById(sectionId)
        if (!element) continue

        const distance = Math.abs(element.getBoundingClientRect().top - containerTop - 12)
        if (distance < minDistance) {
          minDistance = distance
          currentSection = sectionId
        }
      }

      setActiveSection(currentSection)
    }

    updateActiveSection()
    container.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)

    return () => {
      container.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">全局设置</h1>
        <Button variant="ghost" size="sm" onClick={handleTopBack}>
          <ChevronLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
        </Button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧导航栏 */}
        <div className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  activeSection === section.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className={activeSection === section.id ? '' : 'text-gray-500 dark:text-gray-400'}>
                  {section.icon}
                </span>
                <span className="text-sm font-medium">{section.title}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 右侧设置内容 */}
        <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-6 pb-12">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* 执行设置 */}
            <div
              id="execution"
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">执行设置</h2>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base text-gray-900 dark:text-gray-100">命令执行行为</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">控制命令执行过程中的默认行为，包括失败处理、输出展示与执行前确认</p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div>
                      <Label htmlFor="stopOnError" className="text-base text-gray-900 dark:text-gray-100">失败时停止执行</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">当某个命令执行失败时，停止后续命令的执行</p>
                    </div>
                    <Switch
                      id="stopOnError"
                      checked={globalSettings.stopOnError}
                      onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, stopOnError: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div>
                      <Label htmlFor="showFullOutput" className="text-base text-gray-900 dark:text-gray-100">显示详细输出</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">显示命令执行的完整输出信息</p>
                    </div>
                    <Switch
                      id="showFullOutput"
                      checked={globalSettings.showFullOutput}
                      onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, showFullOutput: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div>
                      <Label htmlFor="confirmBeforeExecute" className="text-base text-gray-900 dark:text-gray-100">执行前确认</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">执行命令前显示确认对话框</p>
                    </div>
                    <Switch
                      id="confirmBeforeExecute"
                      checked={globalSettings.confirmBeforeExecute}
                      onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, confirmBeforeExecute: checked })}
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <div>
                    <Label className="text-base text-gray-900 dark:text-gray-100">切换页面时保留当前页面状态</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">离开命令列表或命令预设页面后，返回时继续保留您刚才的浏览状态</p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div>
                      <Label htmlFor="preserveSearchOnNavigation" className="text-base text-gray-900 dark:text-gray-100">保留关键词和过滤结果</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">返回页面后继续保留搜索词和当前过滤结果</p>
                    </div>
                    <Switch
                      id="preserveSearchOnNavigation"
                      checked={globalSettings.preserveSearchOnNavigation}
                      onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, preserveSearchOnNavigation: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div>
                      <Label htmlFor="preservePageOnNavigation" className="text-base text-gray-900 dark:text-gray-100">保留当前页码</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">返回页面后恢复到离开前浏览的分页位置</p>
                    </div>
                    <Switch
                      id="preservePageOnNavigation"
                      checked={globalSettings.preservePageOnNavigation}
                      onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, preservePageOnNavigation: checked })}
                    />
                  </div>
                </div>

                {/* 终端运行模式 */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Label className="text-base text-gray-900 dark:text-gray-100">终端运行模式</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">选择命令运行的方式</p>
                  <RadioGroup
                    value={globalSettings.terminalMode}
                    onValueChange={(value: 'internal' | 'external') => setGlobalSettings({ ...globalSettings, terminalMode: value })}
                    className="mt-4 grid gap-4"
                  >
                    <Label
                      htmlFor="terminal-external"
                      className={`relative flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${globalSettings.terminalMode === 'external' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-100 dark:ring-blue-900/30 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/70 dark:hover:bg-gray-700/50'}`}
                    >
                      <RadioGroupItem value="external" id="terminal-external" className="mt-1" />
                      <div className="grid gap-1.5 leading-none">
                        <div className={`text-sm font-medium ${globalSettings.terminalMode === 'external' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          弹出独立终端窗口
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          在系统默认终端中运行，输出不显示在应用内
                        </p>
                      </div>
                      {globalSettings.terminalMode === 'external' && (
                        <div className="absolute right-3 top-3 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          当前使用
                        </div>
                      )}
                    </Label>

                    <Label
                      htmlFor="terminal-internal"
                      className={`relative flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${globalSettings.terminalMode === 'internal' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-100 dark:ring-blue-900/30 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/70 dark:hover:bg-gray-700/50'}`}
                    >
                      <RadioGroupItem value="internal" id="terminal-internal" className="mt-1" />
                      <div className="grid gap-1.5 leading-none">
                        <div className={`text-sm font-medium ${globalSettings.terminalMode === 'internal' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          在应用内运行
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          在应用内部显示命令输出，适合查看和调试
                        </p>
                      </div>
                      {globalSettings.terminalMode === 'internal' && (
                        <div className="absolute right-3 top-3 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          当前使用
                        </div>
                      )}
                    </Label>
                  </RadioGroup>
                </div>
              </div>
            </div>

            <div
              id="hotkeys"
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">快捷键绑定</h2>
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex shrink-0 items-center whitespace-nowrap rounded-lg bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      说明
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        仅当终端运行模式为“弹出独立终端窗口”时，快捷键会在全局生效。保存设置后，按下绑定的快捷键即可直接执行命令或预设。
                      </p>
                      {globalSettings.terminalMode !== 'external' && (
                        <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                          当前为“在应用内运行”模式，快捷键绑定将暂时禁用，但配置会保留。
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Label className="text-base text-gray-900 dark:text-gray-100">新增绑定</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">通过弹窗添加新的全局快捷键绑定</p>
                      </div>
                      <Button onClick={() => setShowAddBindingDialog(true)} disabled={globalSettings.terminalMode !== 'external'}>
                        <Plus className="w-4 h-4 mr-2" />
                        新增绑定
                      </Button>
                    </div>
                    <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/20 dark:text-gray-400">
                      点击右上角的“新增绑定”后，在弹窗中选择目标并录入快捷键。
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                    <div>
                      <Label className="text-base text-gray-900 dark:text-gray-100">已绑定快捷键</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">保存后立即同步到全局快捷键注册</p>
                    </div>

                    {globalSettings.shortcutBindings.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        还没有快捷键绑定
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {globalSettings.shortcutBindings.map((binding) => (
                          <div key={binding.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${binding.targetType === 'command' ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'}`}>
                                    {binding.targetType === 'command' ? '命令' : '预设'}
                                  </span>
                                  <kbd className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                    {binding.displayLabel}
                                  </kbd>
                                </div>
                                <div className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {getBindingTargetLabel(binding)}
                                </div>
                              </div>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveShortcutBinding(binding.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-lg bg-gray-50 dark:bg-gray-900/30 p-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <p>命令绑定：{availableCommandBindings.length} 个</p>
                      <p>预设绑定：{availablePresetBindings.length} 个</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Dialog open={showAddBindingDialog} onOpenChange={setShowAddBindingDialog}>
              <DialogContent className="max-h-[85vh] sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>新增快捷键绑定</DialogTitle>
                  <DialogDescription>
                    为单条命令或整个命令预设添加一个全局快捷键。
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 overflow-y-auto pr-2 max-h-[calc(85vh-10rem)] custom-scrollbar">
                  <div className="rounded-xl border border-gray-200/80 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                    <div className="mb-3">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">绑定类型</Label>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">先选择要绑定单条命令，还是整个命令预设</p>
                    </div>
                    <RadioGroup
                      value={bindingDraft.targetType}
                      onValueChange={(value: ShortcutBindingTargetType) => setBindingDraft((prev) => ({ ...prev, targetType: value }))}
                      className="grid grid-cols-2 gap-3"
                    >
                      <Label htmlFor="binding-command" className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer ${bindingDraft.targetType === 'command' ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                        <RadioGroupItem value="command" id="binding-command" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">命令</span>
                      </Label>
                      <Label htmlFor="binding-preset" className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer ${bindingDraft.targetType === 'preset' ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                        <RadioGroupItem value="preset" id="binding-preset" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">命令预设</span>
                      </Label>
                    </RadioGroup>
                  </div>

                  <div className="rounded-xl border border-gray-200/80 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                    <div className="mb-3">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">选择目标</Label>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">选择具体要被快捷键触发的内容</p>
                    </div>
                    <div className="relative -ml-1 w-[calc(100%+0.25rem)]">
                      <select
                        value={bindingDraft.targetId}
                        onChange={(e) => setBindingDraft((prev) => ({ ...prev, targetId: e.target.value }))}
                        className="h-11 w-full appearance-none rounded-md border border-gray-200 bg-white px-3 pr-10 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        disabled={currentBindingOptions.length === 0}
                      >
                        {currentBindingOptions.length === 0 ? (
                          <option value="">暂无可绑定项</option>
                        ) : (
                          currentBindingOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                    {bindingDraft.targetId && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {currentBindingOptions.find((option) => option.id === bindingDraft.targetId)?.subLabel}
                      </p>
                    )}
                    {selectedPreset && (
                      <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
                        <div className="mb-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                          预设包含的命令
                        </div>
                        {selectedPreset.commands.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">这个预设当前还没有命令</p>
                        ) : (
                          <div className="space-y-2">
                            {selectedPreset.commands.map((command, index) => (
                              <div key={`${selectedPreset.id}-${command.id}-${index}`} className="rounded-md bg-white/80 px-3 py-2 text-xs dark:bg-gray-900/40">
                                <div className="font-mono text-gray-800 dark:text-gray-200 break-all">{command.content}</div>
                                {command.description && (
                                  <div className="mt-1 text-gray-500 dark:text-gray-400">{command.description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200/80 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                    <div className="mb-3">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">快捷键</Label>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">点击录入后直接按下你想绑定的组合键</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="button"
                        variant={isRecordingShortcut ? 'default' : 'outline'}
                        className="min-w-36 sm:self-start"
                        onClick={() => setIsRecordingShortcut((prev) => !prev)}
                        disabled={globalSettings.terminalMode !== 'external'}
                      >
                        <Keyboard className="w-4 h-4 mr-2" />
                        {isRecordingShortcut ? '按下快捷键...' : '录入快捷键'}
                      </Button>
                      <Input value={bindingDraft.displayLabel} readOnly placeholder="例如 Ctrl + Alt + 1" className="bg-white dark:bg-gray-900/50" />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      支持 Ctrl / Alt / Shift 组合键。按 Esc 可取消录入。
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAddBindingDialog(false)}>
                    取消
                  </Button>
                  <Button type="button" onClick={handleAddShortcutBinding} disabled={globalSettings.terminalMode !== 'external'}>
                    添加绑定
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* 工作目录设置 */}
            <div
              id="directory"
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">工作目录</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="workingDir" className="text-base text-gray-900 dark:text-gray-100">默认工作目录</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">命令执行的默认工作目录</p>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="workingDir"
                      placeholder="例如: C:\Users\Username\Projects"
                      value={globalSettings.workingDir}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, workingDir: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleSelectDirectory}
                      title="选择文件夹"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 编辑器设置 */}
            <div
              id="editor"
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">编辑器设置</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editorCommand" className="text-base text-gray-900 dark:text-gray-100">外部编辑器命令</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">用于打开文件的外部编辑器命令</p>
                  <Input
                    id="editorCommand"
                    placeholder="例如: code --wait"
                    value={globalSettings.editorCommand}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, editorCommand: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            {/* 外观设置 */}
            <div
              id="appearance"
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">外观设置</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base text-gray-900 dark:text-gray-100">主题模式</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">选择应用的外观主题</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={globalSettings.theme === 'light' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGlobalSettings({ ...globalSettings, theme: 'light' })}
                      className="gap-2"
                    >
                      <Sun className="w-4 h-4" />
                      浅色
                    </Button>
                    <Button
                      variant={globalSettings.theme === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGlobalSettings({ ...globalSettings, theme: 'dark' })}
                      className="gap-2"
                    >
                      <Moon className="w-4 h-4" />
                      深色
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 关于信息 */}
            <div
              id="about"
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">关于</h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-base text-gray-900 dark:text-gray-100">版本</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">CommandRunner v1.0.0</p>
                </div>
                <div>
                  <Label className="text-base text-gray-900 dark:text-gray-100">描述</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">一个强大的命令管理和执行工具</p>
                </div>
              </div>
            </div>

            <div className="h-8" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div
        className={`bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 overflow-hidden transition-all duration-250 ease-out ${
          hasUnsavedChanges
            ? 'max-h-24 py-4 opacity-100 translate-y-0'
            : 'max-h-0 py-0 opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-end gap-2 transition-transform duration-250 ease-out">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>
            {justSaved ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {justSaved ? '已保存' : '保存设置'}
          </Button>
        </div>
      </div>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>当前更改尚未保存</AlertDialogTitle>
            <AlertDialogDescription>
              你刚刚修改的设置信息还没有保存，现在返回将丢失这些更改。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>仍要返回</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>保存更改</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
