import type { RouteRecordRaw } from 'vue-router'

export const accountRoutes: RouteRecordRaw[] = [
  {
    path: '/account/profile',
    name: 'account-profile',
    component: () => import('@app/views/platform/PlaceholderView.vue'),
    props: {
      titleKey: 'platform.pages.placeholders.accountProfile.title',
      subtitleKey: 'platform.pages.placeholders.accountProfile.subtitle',
      descriptionKey: 'platform.pages.placeholders.accountProfile.description',
    },
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'settings',
      analyticsId: 'account.profile',
    },
  },
  {
    path: '/account/security',
    name: 'account-security',
    component: () => import('@app/views/platform/PlaceholderView.vue'),
    props: {
      titleKey: 'platform.pages.placeholders.accountSecurity.title',
      subtitleKey: 'platform.pages.placeholders.accountSecurity.subtitle',
      descriptionKey: 'platform.pages.placeholders.accountSecurity.description',
    },
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'settings',
      analyticsId: 'account.security',
    },
  },
]

