import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Depuis Node 25, Node fournit son propre localStorage, vide sans fichier de stockage,
// qui masque celui de jsdom dans les tests. Il est désactivé dans les processus de test.
const versionNode = Number(process.versions.node.split('.')[0])

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      execArgv: versionNode >= 25 ? ['--no-experimental-webstorage'] : [],
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/main.ts', 'src/**/__tests__/**'],
      },
    },
  }),
)
