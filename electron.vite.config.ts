import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'electron/main.ts'),
        output: {
          format: 'cjs',
          entryFileNames: 'index.js'
        }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'electron/preload.ts'),
        output: {
          format: 'cjs',
          entryFileNames: 'index.js'
        }
      }
    }
  },
  renderer: {
    root: path.resolve(__dirname, 'renderer'),
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'renderer/index.html')
      }
    },
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'renderer/app'),
        '@shared': path.resolve(__dirname, 'shared'),
        '@electron': path.resolve(__dirname, 'electron')
      }
    }
  }
})
