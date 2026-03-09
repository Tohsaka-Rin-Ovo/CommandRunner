// Command Store
export interface CommandState {
  commands: Command[];
  loading: boolean;
}

// Preset Store
export interface PresetState {
  presets: Preset[];
  loading: boolean;
  expandedPreset: string | null;
}

// History Store
export interface HistoryState {
  history: History[];
  loading: boolean;
}

// Execution Store
export interface ExecutionState {
  activeCommands: Map<string, CommandExecution>;
  activePresets: Map<string, PresetExecution>;
}
