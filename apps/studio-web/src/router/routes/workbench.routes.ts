import type { RouteRecordRaw } from 'vue-router'

export const workbenchRoutes: RouteRecordRaw[] = [
  {
    path: '/studio/workspaces/:workspaceUuid/resources/:resourceUuid',
    name: 'resource-workbench',
    component: () => import('@app/views/workbench/ResourceWorkbenchView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'workspace',
      analyticsId: 'workbench.resource',
    },
  },
  {
    path: '/studio/workspaces/:workspaceUuid/resources/:resourceUuid/:panel',
    name: 'resource-workbench-panel',
    component: () => import('@app/views/workbench/ResourceWorkbenchView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'workspace',
      analyticsId: 'workbench.resource.panel',
    },
  },
]
