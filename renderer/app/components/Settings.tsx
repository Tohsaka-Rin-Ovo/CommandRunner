import { useState, useEffect } from 'react'
import { ChevronLeft, Save, FolderOpen, Play, FolderOpen as FolderIcon, Edit3, Info, Moon, Sun, Terminal } from 'lucide-react'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { toast } from 'sonner'

interface SettingsProps {
  onClose: () => void
}

type SectionId = 'appearance' | 'execution' | 'directory' | 'editor' | 'about' | 'terminal'

interface Section {
  id: SectionId
  title: string
  icon: React.ReactNode
}

const sections: Section[] = [
  { id: 'execution', title: '执行设置', icon: <Play className="w-5 h-5" /> },
  { id: 'directory', title: '工作目录', icon: <FolderIcon className="w-5 h-5" /> },
  { id: 'editor', title: '编辑器设置', icon: <Edit3 className="w-5 h-5" /> },
  { id: 'appearance', title: '外观设置', icon: <Moon className="w-5 h-5" /> },
  { id: 'about', title: '关于', icon: <Info className="w-5 h-5" /> },
]

export default function Settings({ onClose }: SettingsProps) {
  const [globalSettings, setGlobalSettings] = useState({
    theme: 'light' as 'light' | 'dark',
    stopOnError: false,
    showFullOutput: true,
    confirmBeforeExecute: false,
    workingDir: '',
    editorCommand: '',
    terminalMode: 'internal' as 'internal' | 'external',
  })
  const [activeSection, setActiveSection] = useState<SectionId>('execution')

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (window.electronAPI?.getGlobalSettings) {
          const settings = await window.electronAPI.getGlobalSettings()
          setGlobalSettings(settings)
        } else {
          // 如果 electronAPI 不可用，从 localStorage 读取
          const savedSettings = localStorage.getItem('globalSettings')
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings)
            setGlobalSettings(parsed)
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    loadSettings()
  }, [])

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
      window.dispatchEvent(new Event('settings-changed'))
      toast.success('设置已保存')
      onClose()
    } catch (error) {
      toast.error('保存设置失败')
    }
  }

  const scrollToSection = (sectionId: SectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(sectionId)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">全局设置</h1>
        <Button variant="ghost" size="sm" onClick={onClose}>
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* 执行设置 */}
            <div
              id="execution"
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">执行设置</h2>
              <div className="space-y-6">
                {/* 失败时停止执行 */}
                <div className="flex items-center justify-between">
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

                {/* 显示详细输出 */}
                <div className="flex items-center justify-between">
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

                {/* 执行前确认 */}
                <div className="flex items-center justify-between">
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

                {/* 终端运行模式 */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Label className="text-base text-gray-900 dark:text-gray-100">终端运行模式</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">选择命令运行的方式</p>
                  <RadioGroup
                    value={globalSettings.terminalMode}
                    onValueChange={(value: 'internal' | 'external') => setGlobalSettings({ ...globalSettings, terminalMode: value })}
                    className="mt-4 grid gap-4"
                  >
                    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${globalSettings.terminalMode === 'internal' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                      <RadioGroupItem value="internal" id="terminal-internal" className="mt-1" />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="terminal-internal" className={`text-sm font-medium ${globalSettings.terminalMode === 'internal' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          在应用内运行
                        </Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          在应用内部显示命令输出，适合查看和调试
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${globalSettings.terminalMode === 'external' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                      <RadioGroupItem value="external" id="terminal-external" className="mt-1" />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="terminal-external" className={`text-sm font-medium ${globalSettings.terminalMode === 'external' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          弹出独立终端窗口
                        </Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          在系统默认终端中运行，输出不显示在应用内
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

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
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          保存设置
        </Button>
      </div>
    </div>
  )
}
