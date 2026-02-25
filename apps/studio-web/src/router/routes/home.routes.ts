import type { RouteRecordRaw } from 'vue-router'

export const homeRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@app/views/HomeView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'workspace',
      analyticsId: 'home.view',
      seo: {
        title: 'PrismaSpace - Template Market',
        description: '从模板市场快速开始，完成 AI 产品的创建、协作与商业化。',
        ogTitle: 'PrismaSpace Template Market',
      },
    },
  }
]
