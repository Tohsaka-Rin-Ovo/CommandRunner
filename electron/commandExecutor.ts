import { spawn, ChildProcess } from 'child_process'
import { mainWindow } from './main'

export class CommandExecutor {
  private activeCommands: Map<string, ChildProcess> = new Map()
  private presetQueues: Map<string, string[]> = new Map()
  private presetStopRequested: Map<string, boolean> = new Map()

  execute(commandId: string, command: string, workingDir: string): void {
    const childProcess = spawn(command, {
      shell: true,
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    this.activeCommands.set(commandId, childProcess)

    let output = ''
    let startTime = Date.now()

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

  async executePreset(presetId: string, commands: string[], workingDir: string): Promise<void> {
    this.presetQueues.set(presetId, commands)
    this.presetStopRequested.set(presetId, false)

    for (let i = 0; i < commands.length; i++) {
      if (this.presetStopRequested.get(presetId)) {
        break
      }

      const commandId = `${presetId}-${i}`
      this.sendPresetProgress(presetId, {
        currentIndex: i + 1,
        total: commands.length,
        commandId
      })

      await new Promise<void>((resolve) => {
        this.execute(commandId, commands[i], workingDir)
        
        const completeHandler = (_event: any, data: any) => {
          if (data.commandId === commandId) {
            resolve()
          }
        }

        mainWindow?.webContents.on('command-complete', completeHandler)
      })

      const lastCommand = await this.getLastCommandResult(commandId)
      if (!lastCommand?.success) {
        break
      }
    }

    this.sendPresetProgress(presetId, {
      currentIndex: commands.length,
      total: commands.length,
      commandId: null,
      completed: true
    })

    this.presetQueues.delete(presetId)
    this.presetStopRequested.delete(presetId)
  }

  stopCommand(commandId: string): void {
    const process = this.activeCommands.get(commandId)
    if (process) {
      process.kill()
      this.activeCommands.delete(commandId)
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
  }): void {
    mainWindow?.webContents.send('preset-progress', {
      presetId,
      ...progress
    })
  }

  private async getLastCommandResult(commandId: string): Promise<any> {
    return new Promise((resolve) => {
      const listener = (_event: any, data: any) => {
        if (data.commandId === commandId) {
          resolve(data)
        }
      }
      
      mainWindow?.webContents.on('command-complete', listener)
      
      setTimeout(() => {
        mainWindow?.webContents.removeListener('command-complete', listener)
        resolve(null)
      }, 1000)
    })
  }
}
