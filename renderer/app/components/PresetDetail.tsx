import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { Database, Play, Pause, ChevronLeft, Edit, Trash2, Plus, RotateCcw, CheckCircle, XCircle, AlertCircle, ArrowUp, ArrowDown, Search, Clock, ChevronDown as ChevronDownIcon, ChevronRight as ChevronRightIcon, Save, RefreshCw, Loader2, Star, StarOff } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Progress } from './ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { ScrollArea } from './ui/scroll-area'
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
import { toast } from 'sonner'
import { usePresetStore } from '../store/presetStore'
import { useExecutionStore } from '../store/executionStore'
import { useHistoryStore } from '../store/historyStore'
import { usePresetHistoryStore } from '../store/presetHistoryStore'
import { useCommandStore } from '../store/commandStore'
import { FullOutputDialog } from './FullOutputDialog'
import type { Preset, PresetCommand, PresetHistory } from '@shared/types'
import type { Command as CommandType, History } from '@shared/types'
import { TerminalOutput } from "./TerminalOutput";
import { handleInputFocus } from '../utils/focusUtils'

export default function PresetDetail() {
  // 路由和导航
  const { presetId } = useParams()
  const navigate = useNavigate()
  
  // Store 数据
  const presets = usePresetStore((state) => state.presets)
  const updatePreset = usePresetStore((state) => state.updatePreset)
  const deletePreset = usePresetStore((state) => state.deletePreset)
  const startPreset = useExecutionStore((state) => state.startPreset)
  const stopPreset = useExecutionStore((state) => state.stopPreset)
  const resetPresetExecution = useExecutionStore((state) => state.resetPresetExecution)
  const activePresets = useExecutionStore((state) => state.activePresets)
  const history = useHistoryStore((state) => state.history)
  const fetchHistory = useHistoryStore((state) => state.fetchHistory)
  const commands = useCommandStore((state) => state.commands)
  const fetchCommands = useCommandStore((state) => state.fetchCommands)
  
  // 预设历史
  const presetHistory = usePresetHistoryStore((state) => state.presetHistory)
  const deletePresetHistoryItem = usePresetHistoryStore((state) => state.deletePresetHistoryItem)
  const togglePresetHistoryFavorite = usePresetHistoryStore((state) => state.togglePresetHistoryFavorite)
  
  // 预设数据
  const preset = presets.find(p => p.id === presetId)
  const activePreset = activePresets.get(presetId || '')
  const currentPresetHistory = presetHistory.filter(h => h.presetId === presetId)

  // 对话框状态
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAddCommandDialog, setShowAddCommandDialog] = useState(false)
  const [showEditCommandDialog, setShowEditCommandDialog] = useState(false)
  const [showExecuteConfirmDialog, setShowExecuteConfirmDialog] = useState(false)
  const [showFullOutputDialog, setShowFullOutputDialog] = useState(false)
  const [showFailedConfirmDialog, setShowFailedConfirmDialog] = useState(false)
  const [showStoppedConfirmDialog, setShowStoppedConfirmDialog] = useState(false)
  
  // 表单状态
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [editCommandForm, setEditCommandForm] = useState({ content: '', description: '', details: '' })
  const [editingCommandId, setEditingCommandId] = useState<string | null>(null)
  const [newCommand, setNewCommand] = useState({ content: '', description: '', details: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCommandFromLibrary, setSelectedCommandFromLibrary] = useState<CommandType | null>(null)
  
  // 设置状态（本地）
  const [settings, setSettings] = useState({
    stopOnError: false,
    showFullOutput: true,
    confirmBeforeExecute: false
  })
  
  // 展开/收起状态
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(new Set())
  
  // 全局输出数据
  const [fullOutputData, setFullOutputData] = useState<{
    presetName: string
    executionTime: number
    status: 'success' | 'failed' | 'stopped'
    duration: number
    commands: PresetCommand[]
    output: string
    commandResults: Array<{
      commandId: string
      command: string
      status: 'success' | 'failed' | 'stopped'
      output: string
      duration: number
    }>
  } | null>(null)
  
  // 获取全局设置（从 localStorage 或 electronAPI）
  const [globalSettings, setGlobalSettings] = useState({
    stopOnError: false,
    showFullOutput: true,
    confirmBeforeExecute: false
  })
  
  // 加载全局设置
  useEffect(() => {
    const loadGlobalSettings = async () => {
      try {
        if (window.electronAPI?.getGlobalSettings) {
          const settings = await window.electronAPI.getGlobalSettings()
          setGlobalSettings(settings)
        }
      } catch (error) {
        console.error('Failed to load global settings:', error)
      }
    }
    loadGlobalSettings()
  }, [])
  
  // 加载历史记录
  useEffect(() => {
    if (presetId) {
      fetchHistory()
    }
  }, [presetId, fetchHistory])
  
  // 加载命令库
  useEffect(() => {
    fetchCommands()
  }, [fetchCommands])
  
  // 切换命令展开/收起
  const toggleExpand = (commandId: string) => {
    const newExpanded = new Set(expandedCommands)
    if (newExpanded.has(commandId)) {
      newExpanded.delete(commandId)
    } else {
      newExpanded.add(commandId)
    }
    setExpandedCommands(newExpanded)
  }
  
  // 上移命令
  const moveCommandUp = async (index: number) => {
    if (index === 0) return
    if (!preset || !presetId) return
    
    const newCommands = [...preset.commands]
    const temp = newCommands[index - 1]
    newCommands[index - 1] = newCommands[index]
    newCommands[index] = temp
    
    const reorderedCommands = newCommands.map((cmd, idx) => ({
      ...cmd,
      order: idx
    }))
    
    const success = await updatePreset(presetId, { commands: reorderedCommands })
    if (!success) {
      toast.error('移动命令失败')
    }
  }
  
  // 下移命令
  const moveCommandDown = async (index: number) => {
    if (index === (preset?.commands.length || 0) - 1) return
    if (!preset || !presetId) return
    
    const newCommands = [...preset.commands]
    const temp = newCommands[index + 1]
    newCommands[index + 1] = newCommands[index]
    newCommands[index] = temp
    
    const reorderedCommands = newCommands.map((cmd, idx) => ({
      ...cmd,
      order: idx
    }))
    
    const success = await updatePreset(presetId, { commands: reorderedCommands })
    if (!success) {
      toast.error('移动命令失败')
    }
  }
  
  // 编辑命令
  const handleEditCommand = (command: PresetCommand) => {
    setEditingCommandId(command.id)
    setEditCommandForm({
      content: command.content,
      description: command.description || '',
      details: command.details || ''
    })
    setShowEditCommandDialog(true)
  }
  
  // 保存命令编辑
  const handleSaveCommandEdit = async () => {
    if (!preset || !presetId || !editingCommandId) return
    if (!editCommandForm.content.trim()) {
      toast.error('命令内容不能为空')
      return
    }
    
    const updatedCommands = preset.commands.map(cmd =>
      cmd.id === editingCommandId
        ? { ...cmd, ...editCommandForm }
        : cmd
    )
    
    const success = await updatePreset(presetId, { commands: updatedCommands })
    if (success) {
      toast.success('命令已更新')
      setShowEditCommandDialog(false)
      setEditingCommandId(null)
    } else {
      toast.error('更新命令失败')
    }
  }
  
  // 删除命令
  const handleDeleteCommand = async (commandId: string) => {
    if (!preset || !presetId) return
    
    const updatedCommands = preset.commands.filter(cmd => cmd.id !== commandId)
    
    const success = await updatePreset(presetId, { commands: updatedCommands })
    if (success) {
      toast.success('命令已删除')
      setExpandedCommands(prev => {
        const newSet = new Set(prev)
        newSet.delete(commandId)
        return newSet
      })
    } else {
      toast.error('删除命令失败')
    }
  }
  
  // 从命令库选择
  const handleSelectFromLibrary = (command: CommandType) => {
    setSelectedCommandFromLibrary(command)
  }
  
  // 添加命令
  const handleAddCommand = async () => {
    if (!preset || !presetId) return
    
    let newPresetCommand: PresetCommand
    
    if (selectedCommandFromLibrary) {
      // 从命令库选择
      newPresetCommand = {
        id: `${Date.now()}`,
        content: selectedCommandFromLibrary.content,
        description: selectedCommandFromLibrary.description,
        details: selectedCommandFromLibrary.details,
        order: preset.commands.length
      }
    } else {
      // 输入新命令
      if (!newCommand.content.trim()) {
        toast.error('命令内容不能为空')
        return
      }
      
      newPresetCommand = {
        id: `${Date.now()}`,
        content: newCommand.content,
        description: newCommand.description,
        details: newCommand.details,
        order: preset.commands.length
      }
    }
    
    const updatedCommands = [...preset.commands, newPresetCommand]
    
    const success = await updatePreset(presetId, { commands: updatedCommands })
    if (success) {
      toast.success('命令已添加')
      setShowAddCommandDialog(false)
      setNewCommand({ content: '', description: '', details: '' })
      setSelectedCommandFromLibrary(null)
      setSearchQuery('')
    } else {
      toast.error('添加命令失败')
    }
  }
  
  // 执行预设
  const handleExecutePreset = async () => {
    if (!preset || !presetId) return
    if (preset.commands.length === 0) {
      toast.error('预设中没有命令')
      return
    }
    
    const commandIds = preset.commands.map(cmd => cmd.id)
    try {
      startPreset(presetId, commandIds)
      await window.electronAPI.executePreset(presetId, commandIds)
      toast.success('开始执行预设', { duration: 1250 })
    } catch (error) {
      toast.error('执行预设失败')
    }
  }

  // 重新执行预设
  const handleReExecutePreset = async () => {
    if (!preset || !presetId) return
    if (preset.commands.length === 0) {
      toast.error('预设中没有命令')
      return
    }
    
    resetPresetExecution(presetId)
    setExpandedCommands(new Set())
    
    const commandIds = preset.commands.map(cmd => cmd.id)
    try {
      startPreset(presetId, commandIds)
      await window.electronAPI.executePreset(presetId, commandIds)
      toast.success('开始重新执行预设', { duration: 1250 })
    } catch (error) {
      toast.error('执行预设失败')
    }
  }
  
  // 停止执行
  const handleStopPreset = async () => {
    if (!presetId) return
    if (preset?.commands.length === 0) {
      toast.error('当前预设不存在命令，请添加预设')
      return
    }
    try {
      stopPreset(presetId)
      toast.success('已结束执行')
    } catch (error) {
      toast.error('停止执行失败')
    }
  }

  // 刷新页面
  const handleRefresh = () => {
    navigate(0);
    toast.success('当前预设详情页已刷新');
  }
  
  // 重置执行
  const handleResetExecution = () => {
    setExpandedCommands(new Set())
    toast.success('执行状态已重置')
  }
  
  // 编辑预设
  const handleEditPreset = () => {
    if (!preset) return
    setEditForm({
      name: preset.name,
      description: preset.description || ''
    })
    setShowEditDialog(true)
  }
  
  // 保存预设编辑
  const handleSavePresetEdit = async () => {
    if (!presetId) return
    if (!editForm.name.trim()) {
      toast.error('预设名称不能为空')
      return
    }
    
    const success = await updatePreset(presetId, {
      name: editForm.name,
      description: editForm.description
    })
    
    if (success) {
      toast.success('预设已更新')
      setShowEditDialog(false)
    } else {
      toast.error('更新预设失败')
    }
  }
  
  // 删除预设
  const handleDeletePreset = async () => {
    if (!presetId) return
    
    const success = await deletePreset(presetId)
    if (success) {
      toast.success('预设已删除')
      navigate('/presets')
    } else {
      toast.error('删除预设失败')
      setShowDeleteDialog(false)
    }
  }
  
  // 显示历史详情
  const handleShowHistoryDetail = (historyItem: History) => {
    setFullOutputData({
      presetName: preset?.name || '',
      executionTime: historyItem.startTime,
      status: historyItem.status,
      duration: historyItem.endTime - historyItem.startTime,
      commands: preset?.commands || [],
      output: historyItem.output,
      commandResults: [] // 需要从 historyItem 中解析或获取
    })
    setShowFullOutputDialog(true)
  }
  
  // 获取命令执行状态图标
  const getCommandStatusIcon = (commandId: string) => {
    const execution = activePreset?.commands[commandId]
    if (!execution) return null
    
    if (execution.status === 'running') {
      return <RotateCcw className="w-5 h-5 text-blue-500 animate-spin" />
    } else if (execution.status === 'success') {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (execution.status === 'failed') {
      return <XCircle className="w-5 h-5 text-red-500" />
    } else if (execution.status === 'stopped') {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />
    }
    
    return null
  }
  
  // 获取命令执行结果
  const getCommandExecution = (commandId: string) => {
    return activePreset?.commands[commandId] || null
  }
  
  // 获取成功数量
  const getSuccessCount = () => {
    if (!activePreset) return 0
    return Object.values(activePreset.commands).filter(cmd => cmd.status === 'success').length
  }
  
  // 获取失败数量
  const getFailedCount = () => {
    if (!activePreset) return 0
    return Object.values(activePreset.commands).filter(cmd => cmd.status === 'failed').length
  }
  
  // 获取待执行数量
  const getPendingCount = () => {
    if (!activePreset) return 0
    return Object.values(activePreset.commands).filter(cmd => cmd.status === 'pending').length
  }
  
  // 过滤命令库
  const filteredCommands = commands.filter(cmd =>
    cmd.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  if (!preset) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">预设不存在</p>
          <Button
            variant="outline"
            onClick={() => navigate('/presets')}
            className="mt-4"
          >
            返回预设列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 头部信息区 */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Database className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-semibold text-gray-900">
                    {preset.name}
                  </h1>
                  <Badge variant="outline" className="text-sm">
                    {preset.commands.length} 个命令
                  </Badge>
                </div>
                {preset.description && (
                  <p className="text-sm text-gray-600 mb-2">{preset.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    创建于: {new Date(preset.createdAt).toLocaleString('zh-CN')}
                  </span>
                  <span>更新于: {new Date(preset.updatedAt).toLocaleString('zh-CN')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/presets')}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                返回
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditPreset}
              >
                <Edit className="w-4 h-4 mr-1" />
                编辑
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 hover:text-red-700"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                删除
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 执行控制栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            {activePreset?.overallStatus === 'running' ? (
              <Button
                size="lg"
                className="bg-green-500 hover:bg-green-500 text-white h-12 cursor-wait"
                disabled={true}
              >
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                执行中
              </Button>
            ) : activePreset?.overallStatus === 'completed' ? (
              <Button
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white h-12"
                onClick={handleReExecutePreset}
                disabled={preset.commands.length === 0}
              >
                <Play className="w-5 h-5 mr-2" />
                执行完成
              </Button>
            ) : activePreset?.overallStatus === 'failed' ? (
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white h-12"
                onClick={() => setShowFailedConfirmDialog(true)}
                disabled={preset.commands.length === 0}
              >
                <AlertCircle className="w-5 h-5 mr-2" />
                执行失败
              </Button>
            ) : activePreset?.overallStatus === 'stopped' ? (
              <Button
                size="lg"
                className="bg-yellow-500 hover:bg-yellow-600 text-white h-12"
                onClick={() => setShowStoppedConfirmDialog(true)}
                disabled={preset.commands.length === 0}
              >
                <AlertCircle className="w-5 h-5 mr-2" />
                执行中断
              </Button>
            ) : (
              <Button
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white h-12"
                onClick={() => {
                  if (settings.confirmBeforeExecute && !activePreset) {
                    setShowExecuteConfirmDialog(true)
                  } else {
                    activePreset ? handleReExecutePreset() : handleExecutePreset()
                  }
                }}
                disabled={preset.commands.length === 0}
              >
                <Play className="w-5 h-5 mr-2" />
                执行所有命令
              </Button>
            )}

            <Button
              size="lg"
              variant={activePreset?.overallStatus === 'running' ? "destructive" : "outline"}
              className={`h-12 ${activePreset?.overallStatus !== 'running' ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleStopPreset}
              disabled={activePreset?.overallStatus !== 'running'}
            >
              <Pause className="w-5 h-5 mr-2" />
              结束执行
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={handleRefresh}
              className="h-12"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>

            {activePreset && activePreset.total > 0 && (
              <div className="flex-1 flex items-center gap-3">
                <Progress 
                  value={(activePreset.currentIndex / activePreset.total) * 100} 
                  className={`h-2 flex-1 ${
                    activePreset.overallStatus === 'completed' ? '[&>[role=progressbar]]:bg-green-500' :
                    activePreset.overallStatus === 'failed' ? '[&>[role=progressbar]]:bg-red-500' :
                    activePreset.overallStatus === 'stopped' ? '[&>[role=progressbar]]:bg-yellow-500' :
                    ''
                  }`} 
                />
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {activePreset.currentIndex} / {activePreset.total}
                </span>
              </div>
            )}

            {activePreset && (activePreset.completed || activePreset.currentIndex > 0) && (
              <div className="flex items-center gap-4 text-sm">
                {getSuccessCount() > 0 && (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {getSuccessCount()} 成功
                  </span>
                )}
                {getFailedCount() > 0 && (
                  <span className="text-red-600 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    {getFailedCount()} 失败
                  </span>
                )}
                {getPendingCount() > 0 && (
                  <span className="text-gray-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {getPendingCount()} 待执行
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="commands" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="commands">命令列表</TabsTrigger>
              <TabsTrigger value="history">执行历史</TabsTrigger>
              <TabsTrigger value="settings">设置</TabsTrigger>
            </TabsList>

            {/* 命令列表标签页 */}
            <TabsContent value="commands" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">
                  按顺序执行以下命令
                </h3>
                <Button variant="outline" size="sm" onClick={() => setShowAddCommandDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  添加命令
                </Button>
              </div>

              {preset.commands.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">该预设暂无命令</p>
                  <Button variant="outline" size="sm" onClick={() => setShowAddCommandDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    添加命令
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {preset.commands
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((command, index) => (
                      <div
                        key={command.id}
                        className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <code className="block bg-gray-900 text-green-400 px-4 py-3 rounded font-mono text-sm mb-3 overflow-x-auto">
                                {command.content}
                              </code>
                              <div className="flex items-center justify-between gap-4">
                                <p className="text-sm text-gray-600">
                                  {command.description}
                                </p>
                                <div className="flex items-center gap-2">
                                  {/* 执行状态图标 */}
                                  {getCommandStatusIcon(command.id)}
                                  
                                  {/* 展开按钮 */}
                                  <button
                                    onClick={() => toggleExpand(command.id)}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                  >
                                    {expandedCommands.has(command.id) ? (
                                      <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                                    ) : (
                                      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            {/* 操作按钮组 */}
                            <div className="flex items-center gap-1">
                              {/* 上移按钮 */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveCommandUp(index)}
                                disabled={index === 0}
                                title="上移"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              
                              {/* 下移按钮 */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveCommandDown(index)}
                                disabled={index === preset.commands.length - 1}
                                title="下移"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                              
                              {/* 单独执行按钮 */}
                              <Button
                                size="sm"
                                variant="ghost"
                                title="单独执行"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                              
                              {/* 编辑按钮 */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditCommand(command)}
                                title="编辑"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              
                              {/* 删除按钮 */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteCommand(command.id)}
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* 展开的详情部分 */}
                        {expandedCommands.has(command.id) && (
                          <div className="border-t border-gray-100">
                            <div className="px-4 pb-4 pt-4">
                              <h4 className="font-medium text-sm text-gray-900 mb-2">
                                命令介绍
                              </h4>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {command.details || '暂无详细介绍'}
                              </p>
                            </div>
                            
                            {/* 命令执行输出 */}
                            {getCommandExecution(command.id) && (
                              <div className="px-4 pb-4">
                                <TerminalOutput
                                  output={getCommandExecution(command.id)!.output}
                                  outputLines={getCommandExecution(command.id)!.outputLines}
                                  displayLines={getCommandExecution(command.id)!.displayLines}
                                  showFull={getCommandExecution(command.id)!.showFull}
                                  status={getCommandExecution(command.id)!.status}
                                  duration={getCommandExecution(command.id)!.duration}
                                  command={getCommandExecution(command.id)!.command}
                                  onCopy={() => {}}
                                  onSave={() => {}}
                                  onClear={() => {}}
                                  onClose={() => {
                                    const newExpanded = new Set(expandedCommands);
                                    newExpanded.delete(command.id);
                                    setExpandedCommands(newExpanded);
                                  }}
                                  onToggleFull={() => {
                                    // Handle full output toggle if needed
                                    // This might need updates to execution store to support per-command toggle in presets
                                    // For now, we can show the full output dialog as a fallback
                                    setFullOutputData({
                                      presetName: preset.name,
                                      executionTime: Date.now(), // Approximate
                                      status: getCommandExecution(command.id)!.status as 'success' | 'failed' | 'stopped',
                                      duration: getCommandExecution(command.id)!.duration,
                                      commands: preset.commands,
                                      output: getCommandExecution(command.id)!.output,
                                      commandResults: [{
                                        commandId: command.id,
                                        command: command.content,
                                        status: getCommandExecution(command.id)!.status as 'success' | 'failed' | 'stopped',
                                        output: getCommandExecution(command.id)!.output,
                                        duration: getCommandExecution(command.id)!.duration
                                      }]
                                    })
                                    setShowFullOutputDialog(true)
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            {/* 执行历史标签页 */}
            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">
                  执行历史记录
                </h3>
                <span className="text-xs text-gray-500">
                  共 {currentPresetHistory.length} 条记录
                </span>
              </div>

              {currentPresetHistory.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">暂无执行历史</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentPresetHistory
                    .sort((a, b) => b.startTime - a.startTime)
                    .map((historyItem) => (
                      <div
                        key={historyItem.id}
                        className={`bg-white rounded-lg border ${
                          historyItem.isFavorite ? 'border-yellow-400 shadow-md' : 'border-gray-200'
                        } p-4 hover:shadow-md transition-all`}
                      >
                        {/* 头部：状态、时间、收藏按钮 */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            {/* 状态图标 */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              historyItem.status === 'success' ? 'bg-green-100' :
                              historyItem.status === 'failed' ? 'bg-red-100' :
                              'bg-yellow-100'
                            }`}>
                              {historyItem.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                              {historyItem.status === 'failed' && <XCircle className="w-5 h-5 text-red-600" />}
                              {historyItem.status === 'stopped' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                            </div>

                            {/* 状态文本 */}
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-900">
                                  {historyItem.status === 'success' ? '执行成功' :
                                   historyItem.status === 'failed' ? '执行失败' :
                                   '执行中断'}
                                </span>
                                <Badge variant={historyItem.status === 'success' ? 'default' : 'destructive'}>
                                  {historyItem.status === 'success' ? '成功' :
                                   historyItem.status === 'failed' ? '失败' :
                                   '已停止'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                <span>{new Date(historyItem.startTime).toLocaleString('zh-CN')}</span>
                                <span>耗时: {historyItem.endTime - historyItem.startTime}ms</span>
                              </div>
                            </div>
                          </div>

                          {/* 收藏按钮 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePresetHistoryFavorite(historyItem.id)}
                            className={historyItem.isFavorite ? 'text-yellow-600' : 'text-gray-400'}
                          >
                            <Star className={`w-5 h-5 ${historyItem.isFavorite ? 'fill-current' : ''}`} />
                          </Button>
                        </div>

                        {/* 统计信息 */}
                        <div className="flex items-center gap-6 text-sm mb-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">命令:</span>
                            <span className="font-medium text-gray-900">{historyItem.totalCommands}</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>{historyItem.successCount}</span>
                          </div>
                          {historyItem.failedCount > 0 && (
                            <div className="flex items-center gap-2 text-red-600">
                              <XCircle className="w-4 h-4" />
                              <span>{historyItem.failedCount}</span>
                            </div>
                          )}
                          {historyItem.stoppedCount > 0 && (
                            <div className="flex items-center gap-2 text-yellow-600">
                              <AlertCircle className="w-4 h-4" />
                              <span>{historyItem.stoppedCount}</span>
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/history/preset/${historyItem.id}`)}
                          >
                            查看详情
                          </Button>
                          {!historyItem.isFavorite && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={async () => {
                                const success = await deletePresetHistoryItem(historyItem.id)
                                if (success) {
                                  toast.success('历史记录已删除')
                                } else {
                                  toast.error('收藏的历史记录不能删除')
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              删除
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            {/* 设置标签页 */}
            <TabsContent value="settings" className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">预设执行设置</h3>
                
                <div className="space-y-6">
                  {/* 失败时停止执行 */}
                  <div className="border-b border-gray-100 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">失败时停止执行</p>
                        <p className="text-xs text-gray-500">当某个命令执行失败时，停止后续命令的执行</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">全局默认: {globalSettings.stopOnError ? '是' : '否'}</span>
                        <Switch 
                          checked={settings.stopOnError}
                          onCheckedChange={(checked) => setSettings({ ...settings, stopOnError: checked })}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* 显示详细输出 */}
                  <div className="border-b border-gray-100 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">显示详细输出</p>
                        <p className="text-xs text-gray-500">显示命令执行的完整输出信息</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">全局默认: {globalSettings.showFullOutput ? '是' : '否'}</span>
                        <Switch 
                          checked={settings.showFullOutput}
                          onCheckedChange={(checked) => setSettings({ ...settings, showFullOutput: checked })}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* 执行前确认 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">执行前确认</p>
                        <p className="text-xs text-gray-500">执行预设前显示确认对话框</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">全局默认: {globalSettings.confirmBeforeExecute ? '是' : '否'}</span>
                        <Switch 
                          checked={settings.confirmBeforeExecute}
                          onCheckedChange={(checked) => setSettings({ ...settings, confirmBeforeExecute: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    💡 提示：这些设置只影响当前预设的执行行为，不会影响其他预设。
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 添加命令对话框 */}
      <Dialog open={showAddCommandDialog} onOpenChange={setShowAddCommandDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>添加命令</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="library" className="w-full">
            {/* Tab 切换器 */}
            <TabsList className="grid w-full grid-cols-2 h-12 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger 
                value="library"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  <span>从命令库选择</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="new"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>输入新命令</span>
                </div>
              </TabsTrigger>
            </TabsList>
            
            {/* Tab 内容：从命令库选择 */}
            <TabsContent value="library" className="mt-6">
              <div className="space-y-4">
                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="搜索命令库..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* 命令列表 */}
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {filteredCommands.map((command) => (
                      <div
                        key={command.id}
                        onClick={() => handleSelectFromLibrary(command)}
                        className={`
                          p-4 rounded-lg border cursor-pointer transition-all duration-200
                          ${selectedCommandFromLibrary?.id === command.id 
                            ? 'bg-blue-50 border-blue-500 shadow-sm' 
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                          }
                        `}
                      >
                        <code className="block text-sm font-mono text-gray-900 mb-2">
                          {command.content}
                        </code>
                        <p className="text-sm text-gray-600">{command.description}</p>
                        {command.details && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {command.details}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
            
            {/* Tab 内容：输入新命令 */}
            <TabsContent value="new" className="mt-6 space-y-4">
              <div>
                <Label htmlFor="new-content">命令内容</Label>
                <Textarea
                  id="new-content"
                  placeholder="例如: npm install react"
                  value={newCommand.content}
                  onChange={(e) => setNewCommand({ ...newCommand, content: e.target.value })}
                  className="font-mono min-h-[100px]"
                  onFocus={handleInputFocus}
                />
              </div>
              <div>
                <Label htmlFor="new-description">命令说明</Label>
                <Input
                  id="new-description"
                  placeholder="简短描述"
                  value={newCommand.description}
                  onChange={(e) => setNewCommand({ ...newCommand, description: e.target.value })}
                  onFocus={handleInputFocus}
                />
              </div>
              <div>
                <Label htmlFor="new-details">命令介绍</Label>
                <Textarea
                  id="new-details"
                  placeholder="详细说明"
                  value={newCommand.details}
                  onChange={(e) => setNewCommand({ ...newCommand, details: e.target.value })}
                  className="min-h-[80px]"
                  onFocus={handleInputFocus}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCommandDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddCommand}>
              <Plus className="w-4 h-4 mr-2" />
              添加命令
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑命令对话框 */}
      <Dialog open={showEditCommandDialog} onOpenChange={setShowEditCommandDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑命令</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-content">命令内容</Label>
              <Textarea
                id="edit-content"
                value={editCommandForm.content}
                onChange={(e) => setEditCommandForm({ ...editCommandForm, content: e.target.value })}
                className="font-mono min-h-[100px]"
                onFocus={handleInputFocus}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">命令说明</Label>
              <Input
                id="edit-description"
                value={editCommandForm.description}
                onChange={(e) => setEditCommandForm({ ...editCommandForm, description: e.target.value })}
                onFocus={handleInputFocus}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditCommandDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveCommandEdit}>
              <CheckCircle className="w-4 h-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑预设对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑预设信息</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-preset-name" className="mb-2">预设名称</Label>
              <Input
                id="edit-preset-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                onFocus={handleInputFocus}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-preset-description" className="mb-2">预设描述</Label>
              <Textarea
                id="edit-preset-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
                onFocus={handleInputFocus}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSavePresetEdit}>
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除预设吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除预设"{preset.name}"及其所有执行历史。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePreset}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 执行确认对话框 */}
      <Dialog open={showExecuteConfirmDialog} onOpenChange={setShowExecuteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认执行预设？</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              即将执行预设"<strong>{preset.name}</strong>"，包含<strong>{preset.commands.length}</strong>个命令。
            </p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[300px] overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-900 mb-3">命令列表：</h4>
              <div className="space-y-2">
                {preset.commands.map((command, index) => (
                  <div key={command.id} className="flex items-start gap-3">
                    <span className="text-xs text-gray-500 mt-1">{index + 1}.</span>
                    <div className="flex-1">
                      <code className="text-xs font-mono text-gray-900">{command.content}</code>
                      {command.description && (
                        <p className="text-xs text-gray-600 mt-1">{command.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecuteConfirmDialog(false)}>
              取消
            </Button>
            <Button onClick={() => {
              setShowExecuteConfirmDialog(false)
              handleExecutePreset()
            }}>
              <Play className="w-4 h-4 mr-2" />
              确认执行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 执行失败确认对话框 */}
      <Dialog open={showFailedConfirmDialog} onOpenChange={setShowFailedConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认重新执行？</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              上次执行在第 {activePreset?.currentIndex} 条命令时失败了。是否要重新执行所有命令？
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900 mb-1">执行失败提示</p>
                  <p className="text-xs text-red-700">
                    请检查命令配置后再执行，避免再次失败。
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFailedConfirmDialog(false)}>
              取消
            </Button>
            <Button onClick={() => {
              setShowFailedConfirmDialog(false)
              handleReExecutePreset()
            }}>
              <Play className="w-4 h-4 mr-2" />
              重新执行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 执行中断确认对话框 */}
      <Dialog open={showStoppedConfirmDialog} onOpenChange={setShowStoppedConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认重新执行？</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              上次执行在第 {activePreset?.currentIndex} 条命令时被中断。是否要重新执行所有命令？
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 mb-1">执行中断提示</p>
                  <p className="text-xs text-yellow-700">
                    执行被手动中断，后续命令未执行。可以继续执行或重新开始。
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStoppedConfirmDialog(false)}>
              取消
            </Button>
            <Button onClick={() => {
              setShowStoppedConfirmDialog(false)
              handleReExecutePreset()
            }}>
              <Play className="w-4 h-4 mr-2" />
              重新执行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 完整输出对话框 */}
      {fullOutputData && (
        <FullOutputDialog
          open={showFullOutputDialog}
          onClose={() => setShowFullOutputDialog(false)}
          command={fullOutputData.presetName}
          output={fullOutputData.output}
          duration={fullOutputData.duration}
          status={fullOutputData.status}
        />
      )}
    </div>
  )
}
