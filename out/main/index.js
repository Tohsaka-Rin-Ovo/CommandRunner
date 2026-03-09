"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const child_process = require("child_process");
const DATA_DIR = path.join(electron.app.getPath("userData"), "data");
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}
function readFile(filename, defaultValue) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
  }
  return defaultValue;
}
function writeFile(filename, data) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
}
function getCommands() {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, "commands.json");
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    } else {
      const defaultCommands = [
        {
          id: "1",
          content: "npm install react",
          description: "安装 React 库",
          details: "使用 npm 包管理器安装 React，这是构建用户界面的 JavaScript 库。",
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: "2",
          content: "git commit -m 'initial commit'",
          description: "提交代码到仓库",
          details: "将暂存区的更改提交到本地 Git 仓库，并添加提交信息。",
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: "3",
          content: "docker build -t myapp .",
          description: "构建 Docker 镜像",
          details: "使用当前目录的 Dockerfile 构建名为 myapp 的 Docker 镜像。",
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: "4",
          content: "npm run dev",
          description: "启动开发服务器",
          details: "运行项目的开发模式，通常会启动热重载功能，方便开发调试。",
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: "5",
          content: "git push origin main",
          description: "推送代码到远程仓库",
          details: "将本地 main 分支的提交推送到名为 origin 的远程仓库。",
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: "6",
          content: "docker-compose up -d",
          description: "启动 Docker 容器组",
          details: "使用 docker-compose.yml 配置文件启动所有定义的服务，-d 参数表示后台运行。",
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: "7",
          content: "npm test",
          description: "运行测试",
          details: "执行项目中配置的测试脚本，通常用于运行单元测试和集成测试。",
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: "8",
          content: "git pull origin main",
          description: "拉取远程代码",
          details: "从远程仓库的 main 分支拉取最新代码并合并到当前分支。",
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: "9",
          content: "npm run build",
          description: "构建生产版本",
          details: "编译和打包项目代码，生成优化后的生产环境版本。",
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: "10",
          content: "git status",
          description: "查看仓库状态",
          details: "显示工作目录和暂存区的状态，包括已修改、已暂存和未跟踪的文件。",
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];
      writeFile("commands.json", defaultCommands);
      return defaultCommands;
    }
  } catch (error) {
    console.error(`Error reading commands.json:`, error);
    return [];
  }
}
function saveCommand(command) {
  const commands = getCommands();
  const index = commands.findIndex((c) => c.id === command.id);
  if (index >= 0) {
    commands[index] = { ...commands[index], ...command, updatedAt: Date.now() };
  } else {
    commands.push({
      ...command,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  return writeFile("commands.json", commands);
}
function updateCommand(id, updates) {
  const commands = getCommands();
  const index = commands.findIndex((c) => c.id === id);
  if (index >= 0) {
    commands[index] = { ...commands[index], ...updates, updatedAt: Date.now() };
    return writeFile("commands.json", commands);
  }
  return false;
}
function deleteCommand(id) {
  const commands = getCommands();
  const filtered = commands.filter((c) => c.id !== id);
  return writeFile("commands.json", filtered);
}
function reorderCommands(commandIds) {
  const commands = getCommands();
  const reordered = commandIds.map((id) => commands.find((c) => c.id === id)).filter((c) => c !== void 0);
  return writeFile("commands.json", reordered);
}
function getPresets() {
  return readFile("presets.json", []);
}
function savePreset(preset) {
  const presets = getPresets();
  const index = presets.findIndex((p) => p.id === preset.id);
  if (index >= 0) {
    presets[index] = { ...presets[index], ...preset, updatedAt: Date.now() };
  } else {
    presets.push({
      ...preset,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  return writeFile("presets.json", presets);
}
function updatePreset(id, updates) {
  const presets = getPresets();
  const index = presets.findIndex((p) => p.id === id);
  if (index >= 0) {
    presets[index] = { ...presets[index], ...updates, updatedAt: Date.now() };
    return writeFile("presets.json", presets);
  }
  return false;
}
function deletePreset(id) {
  const presets = getPresets();
  const filtered = presets.filter((p) => p.id !== id);
  return writeFile("presets.json", filtered);
}
function getPresetCommands(presetId, commandIds) {
  const presets = getPresets();
  const preset = presets.find((p) => p.id === presetId);
  if (preset && preset.commands) {
    return preset.commands.filter((cmd) => commandIds.includes(cmd.id)).sort((a, b) => a.order - b.order).map((cmd) => cmd.content);
  }
  return [];
}
function getHistory() {
  return readFile("history.json", []);
}
function clearHistory() {
  return writeFile("history.json", []);
}
function deleteHistoryItem(id) {
  const history = getHistory();
  const filtered = history.filter((h) => h.id !== id);
  return writeFile("history.json", filtered);
}
class CommandExecutor {
  activeCommands = /* @__PURE__ */ new Map();
  presetQueues = /* @__PURE__ */ new Map();
  presetStopRequested = /* @__PURE__ */ new Map();
  execute(commandId, command, workingDir) {
    const childProcess = child_process.spawn(command, {
      shell: true,
      cwd: workingDir,
      stdio: ["pipe", "pipe", "pipe"]
    });
    this.activeCommands.set(commandId, childProcess);
    let output = "";
    let startTime = Date.now();
    childProcess.stdout?.on("data", (data) => {
      const line = data.toString();
      output += line;
      this.sendOutput(commandId, line, "stdout");
    });
    childProcess.stderr?.on("data", (data) => {
      const line = data.toString();
      output += line;
      this.sendOutput(commandId, line, "stderr");
    });
    childProcess.on("close", (code) => {
      const duration = Date.now() - startTime;
      const success = code === 0;
      this.sendComplete(commandId, {
        success,
        code,
        output,
        duration
      });
      this.activeCommands.delete(commandId);
    });
    childProcess.on("error", (error) => {
      const duration = Date.now() - startTime;
      output += `
Error: ${error.message}
`;
      this.sendComplete(commandId, {
        success: false,
        code: -1,
        output,
        duration
      });
      this.activeCommands.delete(commandId);
    });
  }
  async executePreset(presetId, commands, workingDir) {
    this.presetQueues.set(presetId, commands);
    this.presetStopRequested.set(presetId, false);
    for (let i = 0; i < commands.length; i++) {
      if (this.presetStopRequested.get(presetId)) {
        break;
      }
      const commandId = `${presetId}-${i}`;
      this.sendPresetProgress(presetId, {
        currentIndex: i + 1,
        total: commands.length,
        commandId
      });
      await new Promise((resolve) => {
        this.execute(commandId, commands[i], workingDir);
        const completeHandler = (_event, data) => {
          if (data.commandId === commandId) {
            resolve();
          }
        };
        exports.mainWindow?.webContents.on("command-complete", completeHandler);
      });
      const lastCommand = await this.getLastCommandResult(commandId);
      if (!lastCommand?.success) {
        break;
      }
    }
    this.sendPresetProgress(presetId, {
      currentIndex: commands.length,
      total: commands.length,
      commandId: null,
      completed: true
    });
    this.presetQueues.delete(presetId);
    this.presetStopRequested.delete(presetId);
  }
  stopCommand(commandId) {
    const process2 = this.activeCommands.get(commandId);
    if (process2) {
      process2.kill();
      this.activeCommands.delete(commandId);
    }
  }
  stopPreset(presetId) {
    this.presetStopRequested.set(presetId, true);
    const queue = this.presetQueues.get(presetId);
    if (queue) {
      queue.forEach((_, index) => {
        const commandId = `${presetId}-${index}`;
        this.stopCommand(commandId);
      });
    }
  }
  sendOutput(commandId, line, type) {
    exports.mainWindow?.webContents.send("command-output", {
      commandId,
      line,
      type
    });
  }
  sendComplete(commandId, result) {
    exports.mainWindow?.webContents.send("command-complete", {
      commandId,
      ...result
    });
  }
  sendPresetProgress(presetId, progress) {
    exports.mainWindow?.webContents.send("preset-progress", {
      presetId,
      ...progress
    });
  }
  async getLastCommandResult(commandId) {
    return new Promise((resolve) => {
      const listener = (_event, data) => {
        if (data.commandId === commandId) {
          resolve(data);
        }
      };
      exports.mainWindow?.webContents.on("command-complete", listener);
      setTimeout(() => {
        exports.mainWindow?.webContents.removeListener("command-complete", listener);
        resolve(null);
      }, 1e3);
    });
  }
}
const executor = new CommandExecutor();
function setupIPCHandlers() {
  electron.ipcMain.handle("get-commands", async () => {
    return getCommands();
  });
  electron.ipcMain.handle("save-command", async (_event, command) => {
    return saveCommand(command);
  });
  electron.ipcMain.handle("update-command", async (_event, id, command) => {
    return updateCommand(id, command);
  });
  electron.ipcMain.handle("delete-command", async (_event, id) => {
    return deleteCommand(id);
  });
  electron.ipcMain.handle("reorder-commands", async (_event, commandIds) => {
    return reorderCommands(commandIds);
  });
  electron.ipcMain.handle("get-presets", async () => {
    return getPresets();
  });
  electron.ipcMain.handle("save-preset", async (_event, preset) => {
    return savePreset(preset);
  });
  electron.ipcMain.handle("update-preset", async (_event, id, preset) => {
    return updatePreset(id, preset);
  });
  electron.ipcMain.handle("delete-preset", async (_event, id) => {
    return deletePreset(id);
  });
  electron.ipcMain.handle("get-history", async () => {
    return getHistory();
  });
  electron.ipcMain.handle("clear-history", async () => {
    return clearHistory();
  });
  electron.ipcMain.handle("delete-history-item", async (_event, id) => {
    return deleteHistoryItem(id);
  });
  electron.ipcMain.handle("execute-command", async (_event, command, options) => {
    const commandId = Date.now().toString();
    const workingDir = options?.workingDir || electron.app.getPath("home");
    executor.execute(commandId, command, workingDir);
    return commandId;
  });
  electron.ipcMain.handle("execute-preset", async (_event, presetId, commandIds) => {
    const commands = getPresetCommands(presetId, commandIds);
    return executor.executePreset(presetId, commands, electron.app.getPath("home"));
  });
  electron.ipcMain.handle("stop-command", async (_event, commandId) => {
    return executor.stopCommand(commandId);
  });
  electron.ipcMain.handle("stop-preset", async (_event, presetId) => {
    return executor.stopPreset(presetId);
  });
}
const isDev = process.env.NODE_ENV === "development";
exports.mainWindow = null;
function createWindow() {
  electron.Menu.setApplicationMenu(null);
  exports.mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      webSecurity: true,
      sandbox: true
    },
    title: "CommandRunner",
    backgroundColor: "#f9fafb"
  });
  if (isDev) {
    const port = process.env.ELECTRON_RENDERER_URL ? new URL(process.env.ELECTRON_RENDERER_URL).port : "5173";
    exports.mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL || `http://localhost:${port}/`);
  } else {
    exports.mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  exports.mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === "i" || input.key === "F12") {
      if (input.type === "keyDown") {
        exports.mainWindow?.webContents.toggleDevTools();
      }
      event.preventDefault();
    }
  });
  exports.mainWindow.on("closed", () => {
    exports.mainWindow = null;
  });
}
electron.app.whenReady().then(() => {
  setupIPCHandlers();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
