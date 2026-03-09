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
}

export interface CommandExecution {
  id: string;
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
}
