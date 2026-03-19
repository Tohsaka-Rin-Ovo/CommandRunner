import { createMemoryRouter } from 'react-router'
import Root from './components/Root'
import CommandList from './components/CommandList'
import CommandPresets from './components/CommandPresets'
import PresetDetail from './components/PresetDetail'
import CommandHistory from './components/CommandHistory'
import HistoryPage from './components/HistoryPage'
import PresetHistoryDetail from './components/PresetHistoryDetail'
import CommandHistoryDetail from './components/CommandHistoryDetail'
import RunningTasks from './components/RunningTasks'

export const router = createMemoryRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: CommandList },
      { path: 'presets', Component: CommandPresets },
      { path: 'presets/:presetId', Component: PresetDetail },
      { path: 'running', Component: RunningTasks },
      { path: 'history', Component: HistoryPage },
      { path: 'history/preset/:id', Component: PresetHistoryDetail },
      { path: 'history/command/:id', Component: CommandHistoryDetail },
    ],
  },
])
