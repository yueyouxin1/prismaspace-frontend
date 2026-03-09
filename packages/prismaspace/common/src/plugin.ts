import type { App } from 'vue'
import { EditorUiPlugin } from '@prismaspace/editor/plugin'

export const CommonUiPlugin = {
  install(app: App) {
    app.use(EditorUiPlugin)
  },
}
