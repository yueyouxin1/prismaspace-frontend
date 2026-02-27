import type { RouteRecordRaw } from 'vue-router'

export const consoleRoutes: RouteRecordRaw[] = [
  {
    path: '/console',
    name: 'platform-console',
    component: () => import('@app/views/HomeView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'workspace',
      analyticsId: 'platform.console',
    },
  },
  {
    path: '/projects',
    name: 'platform-projects',
    component: () => import('@app/views/platform/ProjectsView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'workspace',
      analyticsId: 'platform.projects',
    },
  },
  {
    path: '/projects/:projectId',
    name: 'platform-project-detail',
    component: () => import('@app/views/platform/ProjectDetailView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'workspace',
      analyticsId: 'platform.project.detail',
    },
  },
  {
    path: '/resources',
    name: 'platform-resources',
    component: () => import('@app/views/platform/ResourcesView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'workspace',
      analyticsId: 'platform.resources',
    },
  },
  {
    path: '/assets',
    name: 'platform-assets',
    component: () => import('@app/views/platform/AssetsView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'workspace',
      analyticsId: 'platform.assets',
    },
  },
  {
    path: '/teams',
    name: 'platform-teams',
    component: () => import('@app/views/platform/TeamsView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'workspace',
      analyticsId: 'platform.teams',
    },
  },
  {
    path: '/workspaces',
    name: 'platform-workspaces',
    component: () => import('@app/views/platform/WorkspacesView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'workspace',
      analyticsId: 'platform.workspaces',
    },
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('@app/views/ForbiddenView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'workspace',
      analyticsId: 'platform.forbidden',
    },
  },
]
