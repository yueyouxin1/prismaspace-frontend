import type { RouteRecordRaw } from 'vue-router'

export const settingsRoutes: RouteRecordRaw[] = [
  {
    path: '/settings/team',
    name: 'platform-settings-team',
    component: () => import('@app/views/platform/SettingsTeamView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'settings',
      analyticsId: 'platform.settings.team',
    },
  },
  {
    path: '/settings/workspace',
    name: 'platform-settings-workspace',
    component: () => import('@app/views/platform/SettingsTeamView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'settings',
      analyticsId: 'platform.settings.workspace',
    },
  },
]

