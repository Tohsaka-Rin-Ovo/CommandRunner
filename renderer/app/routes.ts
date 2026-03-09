import { createBrowserRouter } from 'react-router'
import Root from './components/Root'
import CommandList from './components/CommandList'
import CommandPresets from './components/CommandPresets'
import CommandHistory from './components/CommandHistory'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: CommandList },
      { path: 'presets', Component: CommandPresets },
      { path: 'history', Component: CommandHistory },
    ],
  },
])
