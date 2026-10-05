import { resolve } from 'path'
import { createRequire } from 'module'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)

// Paquetes exclusivos de Windows (declarados en optionalDependencies): en
// Linux/macOS no se instalan y Rollup no podría resolverlos, así que solo se
// marcan como externos cuando NO están instalados. En Windows se empaquetan
// exactamente igual que siempre.
const missingOptionalWindowsDeps = ['win-media-control', 'windows-media-sessions'].filter((dependency) => {
  try {
    require.resolve(dependency)
    return false
  } catch {
    return true
  }
})

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: missingOptionalWindowsDeps
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
