export interface Command {
  id: string;
  content: string;
  description: string;
  details: string;
  createdAt: number;
  updatedAt: number;
}

export interface PresetCommand {
  id: string;
  content: string;
  description?: string;
  details?: string;
  order: number;
}

export interface Preset {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  commands: PresetCommand[];
  isDefault?: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface History {
  id: string;
  command: string;
  commandId?: string;
  presetId?: string;
  status: 'success' | 'failed' | 'stopped';
  startTime: number;
  endTime: number;
  output: string;
  isFavorite?: boolean;
}

export interface PresetHistory {
  id: string;
  presetId: string;
  presetName: string;
  status: 'success' | 'failed' | 'stopped';
  startTime: number;
  endTime: number;
  totalCommands: number;
  successCount: number;
  failedCount: number;
  stoppedCount: number;
  isFavorite: boolean;
  commandResults: Array<{
    commandId: string;
    command: string;
    description?: string;
    status: 'success' | 'failed' | 'stopped';
    output: string;
    duration: number;
  }>;
}

export interface CommandExecution {
  id: string;
  sourceCommandId?: string;
  command: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'stopped';
  output: string;
  outputLines: string[];
  displayLines: string[];
  showFull: boolean;
  duration: number;
  startTime: number;
}

export interface PresetExecution {
  id: string;
  commands: { [commandId: string]: CommandExecution };
  currentIndex: number;
  total: number;
  completed: boolean;
  stopRequested: boolean;
  overallStatus: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
  failureCount: number;
}
