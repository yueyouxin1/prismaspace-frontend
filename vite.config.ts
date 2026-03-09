import path from 'node:path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

const resolvePackage = (...segments: string[]) => path.resolve(__dirname, 'packages', 'prismaspace', ...segments)

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  envPrefix: ['APP_', 'VITE_'],
  publicDir: path.resolve(__dirname, './apps/studio-web/public'),
  resolve: {
    alias: [
      { find: '@prismaspace/contracts', replacement: resolvePackage('contracts', 'src') },
      { find: '@prismaspace/sdk', replacement: resolvePackage('sdk', 'src') },
      { find: '@prismaspace/common', replacement: resolvePackage('common', 'src') },
      { find: '@prismaspace/editor', replacement: resolvePackage('editor', 'src') },
      { find: '@prismaspace/generator', replacement: resolvePackage('generator', 'src') },
      { find: '@prismaspace/ui-ai-elements', replacement: resolvePackage('ui-ai-elements', 'src') },
      { find: '@prismaspace/ui-shadcn', replacement: resolvePackage('ui-shadcn', 'src') },
      { find: '@prismaspace/ui-reka', replacement: resolvePackage('ui-reka', 'src') },
      { find: '@prismaspace/asset-hub', replacement: resolvePackage('asset-hub', 'src') },
      { find: '@prismaspace/resources-core', replacement: resolvePackage('resources-core', 'src') },
      { find: '@prismaspace/resources', replacement: resolvePackage('resources', 'src') },
      { find: '@prismaspace/agent', replacement: resolvePackage('resources', 'agent', 'src') },
      { find: '@prismaspace/tool', replacement: resolvePackage('resources', 'tool', 'src') },
      { find: '@prismaspace/knowledge', replacement: resolvePackage('resources', 'knowledge', 'src') },
      { find: '@prismaspace/tenantdb', replacement: resolvePackage('resources', 'tenantdb', 'src') },
      { find: '@prismaspace/uiapp', replacement: resolvePackage('resources', 'uiapp', 'src') },
      { find: '@prismaspace/workflow', replacement: resolvePackage('resources', 'workflow', 'src') },
      { find: '@prismaspace/workflow-playground', replacement: resolvePackage('resources', 'workflow', 'playground', 'src') },
      { find: '@app', replacement: path.resolve(__dirname, './apps/studio-web/src') },
    ],
  },
})
