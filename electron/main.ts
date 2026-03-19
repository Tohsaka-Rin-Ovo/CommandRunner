import { app, BrowserWindow, Menu } from 'electron'
import path from 'path'
import { setIPCMainWindow, setupIPCHandlers } from './ipcHandlers'
import { refreshGlobalShortcuts, unregisterGlobalShortcuts } from './shortcutManager'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  // 移除默认的应用菜单栏
  Menu.setApplicationMenu(null)

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      webSecurity: true,
      sandbox: false, // 禁用沙箱以确保 preload 正确加载和通信
    },
    title: 'CommandRunner',
    backgroundColor: '#f9fafb',
  })

  // 调试日志：打印 preload 路径
  console.log('[Main] __dirname:', __dirname)
  console.log('[Main] Preload path:', path.join(__dirname, '../preload/index.js'))

  if (isDev) {
    const port = process.env.ELECTRON_RENDERER_URL ? new URL(process.env.ELECTRON_RENDERER_URL).port : '5173'
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL || `http://localhost:${port}/`)
    // 移除自动打开开发者工具的代码
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // 添加快捷键切换开发者工具 (F12 或 Ctrl+Shift+I)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (
      (input.control && input.shift && input.key.toLowerCase() === 'i') ||
      input.key === 'F12'
    ) {
      if (input.type === 'keyDown') {
        mainWindow?.webContents.toggleDevTools()
      }
      event.preventDefault()
    }
  })

  mainWindow.on('closed', () => {
    setIPCMainWindow(null)
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  setupIPCHandlers(mainWindow)
  refreshGlobalShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      setIPCMainWindow(mainWindow)
    }
  })
})

app.on('will-quit', () => {
  unregisterGlobalShortcuts()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export { mainWindow }
