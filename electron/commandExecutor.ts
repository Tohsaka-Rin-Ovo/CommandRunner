import { spawn, ChildProcess } from 'child_process'
import { mainWindow } from './main'

export class CommandExecutor {
  private activeCommands: Map<string, ChildProcess> = new Map()
  private presetQueues: Map<string, string[]> = new Map()
  private presetStopRequested: Map<string, boolean> = new Map()
  private commandStatuses: Map<string, 'success' | 'failed' | 'stopped'> = new Map()

  execute(commandId: string, command: string, workingDir: string, terminalMode: 'internal' | 'external' = 'internal'): void {
    const startTime = Date.now()

    if (terminalMode === 'external') {
      const platform = process.platform
      let childProcess: ChildProcess

      if (platform === 'win32') {
        childProcess = spawn('cmd.exe', ['/c', 'start', 'cmd', '/k', command], {
          cwd: workingDir,
          detached: true,
          shell: false
        })
      } else if (platform === 'darwin') {
        const appleScript = `tell application "Terminal" to do script "${command.replace(/"/g, '\\"')}" in front window`
        childProcess = spawn('osascript', ['-e', appleScript], {
          cwd: workingDir,
          detached: true
        })
      } else {
        const terminals = ['gnome-terminal', 'xterm', 'konsole', 'xfce4-terminal', 'mate-terminal']
        for (const term of terminals) {
          try {
            childProcess = spawn(term, ['-e', command], {
              cwd: workingDir,
              detached: true
            })
            break
          } catch (e) {
            continue
          }
        }
      }

      childProcess?.unref()

      setTimeout(() => {
        this.sendComplete(commandId, {
          success: true,
          code: 0,
          output: '命令在独立终端中执行',
          duration: Date.now() - startTime
        })
      }, 100)

      return
    }

    const childProcess = spawn(command, {
      shell: true,
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    this.activeCommands.set(commandId, childProcess)

    let output = ''

    childProcess.stdout?.on('data', (data) => {
      const line = data.toString()
      output += line
      this.sendOutput(commandId, line, 'stdout')
    })

    childProcess.stderr?.on('data', (data) => {
      const line = data.toString()
      output += line
      this.sendOutput(commandId, line, 'stderr')
    })

    childProcess.on('close', (code) => {
      const duration = Date.now() - startTime
      const success = code === 0

      this.sendComplete(commandId, {
        success,
        code,
        output,
        duration
      })

      this.activeCommands.delete(commandId)
    })

    childProcess.on('error', (error) => {
      const duration = Date.now() - startTime
      output += `\nError: ${error.message}\n`

      this.sendComplete(commandId, {
        success: false,
        code: -1,
        output,
        duration
      })

      this.activeCommands.delete(commandId)
    })
  }

  async executePreset(presetId: string, commands: string[], workingDir: string, terminalMode: 'internal' | 'external' = 'internal'): Promise<void> {
    this.presetQueues.set(presetId, commands)
    this.presetStopRequested.set(presetId, false)

    let allCommandsCompleted = true

    for (let i = 0; i < commands.length; i++) {
      if (this.presetStopRequested.get(presetId)) {
        allCommandsCompleted = false
        this.sendPresetProgress(presetId, {
          currentIndex: i + 1,
          total: commands.length,
          commandId: null,
          commandStatus: 'stopped'
        })
        break
      }

      const commandId = `${presetId}-${i}`
      this.sendPresetProgress(presetId, {
        currentIndex: i + 1,
        total: commands.length,
        commandId
      })

      this.execute(commandId, commands[i], workingDir, terminalMode)

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          resolve()
        }, 120000)

        const checkInterval = setInterval(() => {
          if (!this.activeCommands.has(commandId)) {
            clearInterval(checkInterval)
            clearTimeout(timeout)
            resolve()
          }
        }, 500)
      })

      if (this.presetStopRequested.get(presetId)) {
        allCommandsCompleted = false
        this.sendPresetProgress(presetId, {
          currentIndex: i + 1,
          total: commands.length,
          commandId: null,
          commandStatus: 'stopped'
        })
        break
      }

      const commandStatus = this.commandStatuses.get(commandId)
      if (commandStatus === 'failed') {
        allCommandsCompleted = false
        this.sendPresetProgress(presetId, {
          currentIndex: i + 1,
          total: commands.length,
          commandId: null,
          commandStatus: 'failed'
        })
        break
      }
    }

    if (allCommandsCompleted) {
      this.sendPresetProgress(presetId, {
        currentIndex: commands.length,
        total: commands.length,
        commandId: null,
        completed: true
      })
    }

    this.presetQueues.delete(presetId)
    this.presetStopRequested.delete(presetId)
    for (let i = 0; i < commands.length; i++) {
      const commandId = `${presetId}-${i}`
      this.commandStatuses.delete(commandId)
    }
  }

  stopCommand(commandId: string): void {
    const process = this.activeCommands.get(commandId)
    if (process) {
      process.kill()
      this.activeCommands.delete(commandId)
      this.commandStatuses.set(commandId, 'stopped')
    }
  }

  stopPreset(presetId: string): void {
    this.presetStopRequested.set(presetId, true)

    const queue = this.presetQueues.get(presetId)
    if (queue) {
      queue.forEach((_, index) => {
        const commandId = `${presetId}-${index}`
        this.stopCommand(commandId)
      })
    }
  }

  private sendOutput(commandId: string, line: string, type: 'stdout' | 'stderr'): void {
    mainWindow?.webContents.send('command-output', {
      commandId,
      line,
      type
    })
  }

  private sendComplete(commandId: string, result: {
    success: boolean
    code: number | null
    output: string
    duration: number
  }): void {
    const status: 'success' | 'failed' = result.success ? 'success' : 'failed'
    this.commandStatuses.set(commandId, status)

    mainWindow?.webContents.send('command-complete', {
      commandId,
      ...result
    })
  }

  private sendPresetProgress(presetId: string, progress: {
    currentIndex: number
    total: number
    commandId: string | null
    completed?: boolean
    commandStatus?: 'success' | 'failed' | 'stopped'
  }): void {
    mainWindow?.webContents.send('preset-progress', {
      presetId,
      ...progress
    })
  }
}
