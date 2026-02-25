import 'vue-router'

type AppLayout = 'app' | 'workspace' | 'blank' | 'marketing' | 'console' | 'settings' | 'auth'

interface SeoMeta {
  title?: string
  description?: string
  ogTitle?: string
}

declare module 'vue-router' {
  interface RouteMeta {
    layout?: AppLayout
    requiresAuth?: boolean
    analyticsId?: string
    featureFlag?: string
    section?: 'marketing' | 'auth' | 'console' | 'billing' | 'settings' | 'workspace'
    seo?: SeoMeta
  }
}

export {}
