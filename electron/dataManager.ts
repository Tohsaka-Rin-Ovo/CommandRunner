import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const DATA_DIR = path.join(app.getPath('userData'), 'data')
console.log('[DataManager] DATA_DIR:', DATA_DIR)

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    console.log('[DataManager] Creating DATA_DIR:', DATA_DIR)
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readFile<T>(filename: string, defaultValue: T): T {
  ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data) as T
    }
  } catch (error) {
    console.error(`Error reading ${filename}:`, error)
  }
  
  return defaultValue
}

function writeFile<T>(filename: string, data: T): boolean {
  ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  
  try {
    console.log(`[DataManager] Writing to ${filePath}`)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    console.log(`[DataManager] Successfully wrote to ${filePath}`)
    return true
  } catch (error) {
    console.error(`Error writing ${filename}:`, error)
    return false
  }
}

// Commands
export function getCommands(): any[] {
  ensureDataDir()
  const filePath = path.join(DATA_DIR, 'commands.json')
  
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data) as any[]
    } else {
      // Initialize with default commands on first run
      const defaultCommands = [
        {
          id: "1",
          content: "npm install react",
          description: "安装 React 库",
          details: "使用 npm 包管理器安装 React，这是构建用户界面的 JavaScript 库。",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "2",
          content: "git commit -m 'initial commit'",
          description: "提交代码到仓库",
          details: "将暂存区的更改提交到本地 Git 仓库，并添加提交信息。",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "3",
          content: "docker build -t myapp .",
          description: "构建 Docker 镜像",
          details: "使用当前目录的 Dockerfile 构建名为 myapp 的 Docker 镜像。",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "4",
          content: "npm run dev",
          description: "启动开发服务器",
          details: "运行项目的开发模式，通常会启动热重载功能，方便开发调试。",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "5",
          content: "git push origin main",
          description: "推送代码到远程仓库",
          details: "将本地 main 分支的提交推送到名为 origin 的远程仓库。",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "6",
          content: "docker-compose up -d",
          description: "启动 Docker 容器组",
          details: "使用 docker-compose.yml 配置文件启动所有定义的服务，-d 参数表示后台运行。",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "7",
          content: "npm test",
          description: "运行测试",
          details: "执行项目中配置的测试脚本，通常用于运行单元测试和集成测试。",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "8",
          content: "git pull origin main",
          description: "拉取远程代码",
          details: "从远程仓库的 main 分支拉取最新代码并合并到当前分支。",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "9",
          content: "npm run build",
          description: "构建生产版本",
          details: "编译和打包项目代码，生成优化后的生产环境版本。",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "10",
          content: "git status",
          description: "查看仓库状态",
          details: "显示工作目录和暂存区的状态，包括已修改、已暂存和未跟踪的文件。",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]
      writeFile('commands.json', defaultCommands)
      return defaultCommands
    }
  } catch (error) {
    console.error(`Error reading commands.json:`, error)
    return []
  }
}

export function saveCommand(command: any): boolean {
  const commands = getCommands()
  const index = commands.findIndex(c => c.id === command.id)
  
  if (index >= 0) {
    commands[index] = { ...commands[index], ...command, updatedAt: Date.now() }
  } else {
    commands.unshift({
      ...command,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }
  
  return writeFile('commands.json', commands)
}

export function updateCommand(id: string, updates: any): boolean {
  const commands = getCommands()
  const index = commands.findIndex(c => c.id === id)
  
  if (index >= 0) {
    commands[index] = { ...commands[index], ...updates, updatedAt: Date.now() }
    return writeFile('commands.json', commands)
  }
  
  return false
}

export function deleteCommand(id: string): boolean {
  const commands = getCommands()
  const filtered = commands.filter(c => c.id !== id)
  return writeFile('commands.json', filtered)
}

export function reorderCommands(commandIds: string[]): boolean {
  const commands = getCommands()
  const reordered = commandIds
    .map(id => commands.find(c => c.id === id))
    .filter((c): c is any => c !== undefined)
  
  return writeFile('commands.json', reordered)
}

// Presets
export function getPresets(): any[] {
  return readFile<any[]>('presets.json', [])
}

export function savePreset(preset: any): boolean {
  const presets = getPresets()
  const index = presets.findIndex(p => p.id === preset.id)
  
  if (index >= 0) {
    presets[index] = { ...presets[index], ...preset, updatedAt: Date.now() }
  } else {
    presets.push({
      ...preset,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }
  
  return writeFile('presets.json', presets)
}

export function updatePreset(id: string, updates: any): boolean {
  console.log('[DataManager] updatePreset called:', id, updates);

  const presets = getPresets()
  // 打印所有 ID 类型以排查
  console.log('[DataManager] Existing IDs:', presets.map(p => ({ id: p.id, type: typeof p.id })));

  // 强制转换为字符串比较
  const index = presets.findIndex(p => String(p.id) === String(id))
  console.log('[DataManager] Preset index:', index);

  if (index >= 0) {
    const oldPreset = presets[index];
    const newPreset = { ...oldPreset, ...updates, updatedAt: Date.now() }
    presets[index] = newPreset

    console.log('[DataManager] Updated preset:', newPreset);

    const writeResult = writeFile('presets.json', presets)
    console.log('[DataManager] Write result:', writeResult);

    return writeResult
  }

  console.error('[DataManager] Preset not found:', id);
  return false
}

export function deletePreset(id: string): boolean {
  console.log('[DataManager] deletePreset called:', id);
  const presets = getPresets()
  const initialLength = presets.length;
  console.log('[DataManager] Initial presets count:', initialLength);

  const filtered = presets.filter(p => p.id !== id)
  const filteredLength = filtered.length;
  console.log('[DataManager] Filtered presets count:', filteredLength);

  if (initialLength === filteredLength) {
    console.warn('[DataManager] Preset not found for deletion:', id);
    // 如果预设不存在，认为删除成功（幂等性）
    return true
  }

  const result = writeFile('presets.json', filtered)
  console.log('[DataManager] deletePreset write result:', result);
  return result
}

export function getPresetCommands(presetId: string, commandIds: string[]): string[] {
  const presets = getPresets()
  const preset = presets.find(p => p.id === presetId)
  
  if (preset && preset.commands) {
    return preset.commands
      .filter((cmd: any) => commandIds.includes(cmd.id))
      .sort((a: any, b: any) => a.order - b.order)
      .map((cmd: any) => cmd.content)
  }
  
  return []
}

// History
export function getHistory(): any[] {
  return readFile<any[]>('history.json', [])
}

export function addHistory(historyItem: any): boolean {
  const history = getHistory()

  // 检查相同命令的记录数量，限制最多20条
  const sameCommandHistory = history.filter(h => h.command === historyItem.command)
  if (sameCommandHistory.length >= 20) {
    // 删除最旧的记录（相同命令）
    const filteredHistory = history.filter(h => h.command !== historyItem.command)
    filteredHistory.unshift({
      ...historyItem,
      id: historyItem.id || Date.now().toString(),
      isFavorite: false
    })
    return writeFile('history.json', filteredHistory)
  }

  history.unshift({
    ...historyItem,
    id: historyItem.id || Date.now().toString(),
    isFavorite: false
  })

  // Keep only last 100 history items globally
  const trimmedHistory = history.slice(0, 100)
  return writeFile('history.json', trimmedHistory)
}

export function clearHistory(): boolean {
  return writeFile('history.json', [])
}

export function deleteHistoryItem(id: string): boolean {
  const history = getHistory()
  const item = history.find(h => h.id === id)

  // 如果是收藏的记录，不允许删除
  if (item?.isFavorite) {
    return false
  }

  const filtered = history.filter(h => h.id !== id)
  return writeFile('history.json', filtered)
}

export function toggleHistoryFavorite(id: string): boolean {
  const history = getHistory()
  const updatedHistory = history.map(h =>
    h.id === id ? { ...h, isFavorite: !h.isFavorite } : h
  )
  return writeFile('history.json', updatedHistory)
}

export function cancelAllHistoryFavorites(): boolean {
  const history = getHistory()
  const updatedHistory = history.map(h => ({ ...h, isFavorite: false }))
  return writeFile('history.json', updatedHistory)
}

export function getFavoriteHistory(): any[] {
  return getHistory().filter(h => h.isFavorite)
}

// Preset History
export function getPresetHistory(): any[] {
  return readFile<any[]>('presetHistory.json', [])
}

export function addPresetHistory(historyItem: any): boolean {
  const history = getPresetHistory()

  // 检查该预设的历史记录数量，限制最多20条
  const presetHistory = history.filter(h => h.presetId === historyItem.presetId)

  // 如果已达到20条，删除最旧的未收藏记录
  if (presetHistory.length >= 20) {
    const nonFavorites = presetHistory.filter(h => !h.isFavorite)
    if (nonFavorites.length > 0) {
      const oldestNonFavorite = nonFavorites.sort((a, b) => a.startTime - b.startTime)[0]
      const filteredHistory = history.filter(h => h.id !== oldestNonFavorite.id)
      filteredHistory.unshift({
        ...historyItem,
        id: historyItem.id || Date.now().toString(),
        isFavorite: false
      })
      return writeFile('presetHistory.json', filteredHistory)
    }
  }

  history.unshift({
    ...historyItem,
    id: historyItem.id || Date.now().toString(),
    isFavorite: false
  })

  return writeFile('presetHistory.json', history)
}

export function clearPresetHistory(): boolean {
  return writeFile('presetHistory.json', [])
}

export function deletePresetHistoryItem(id: string): boolean {
  const history = getPresetHistory()
  const item = history.find(h => h.id === id)

  // 如果是收藏的记录，不允许删除
  if (item?.isFavorite) {
    return false
  }

  const filtered = history.filter(h => h.id !== id)
  return writeFile('presetHistory.json', filtered)
}

export function togglePresetHistoryFavorite(id: string): boolean {
  const history = getPresetHistory()
  const updatedHistory = history.map(h =>
    h.id === id ? { ...h, isFavorite: !h.isFavorite } : h
  )
  return writeFile('presetHistory.json', updatedHistory)
}

export function getFavoritePresetHistory(): any[] {
  return getPresetHistory().filter(h => h.isFavorite)
}

export function cancelAllPresetHistoryFavorites(): boolean {
  const history = getPresetHistory()
  const updatedHistory = history.map(h => ({ ...h, isFavorite: false }))
  return writeFile('presetHistory.json', updatedHistory)
}
