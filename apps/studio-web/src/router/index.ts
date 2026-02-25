import { createRouter, createWebHistory } from 'vue-router'
import { pinia } from '@app/core/providers/pinia'
import { routes } from '@app/router/routes'
import { usePlatformStore } from '@app/stores/platform'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const store = usePlatformStore(pinia)
  store.hydrate()

  if (store.sessionExpired) {
    store.markSessionExpired()
  }

  if (to.meta.requiresAuth && !store.isAuthenticated) {
    return {
      path: '/auth/sign-in',
      query: {
        redirect: to.fullPath,
      },
    }
  }

  if (to.path.startsWith('/auth') && store.isAuthenticated && to.query.redirect) {
    const redirect = Array.isArray(to.query.redirect) ? to.query.redirect[0] : to.query.redirect
    if (redirect) {
      return redirect
    }
  }

  if (store.isAuthenticated) {
    try {
      await store.loadPlatformContext()
    } catch {
      if (to.meta.requiresAuth && !store.isAuthenticated) {
        return {
          path: '/auth/sign-in',
          query: {
            redirect: to.fullPath,
          },
        }
      }
    }
  }

  return true
})

router.afterEach((to) => {
  if (to.meta.seo?.title) {
    document.title = to.meta.seo.title
  }

  const description = to.meta.seo?.description
  if (description) {
    const tag = document.querySelector('meta[name="description"]')
    if (tag) {
      tag.setAttribute('content', description)
    }
  }

  const ogTitle = to.meta.seo?.ogTitle
  if (ogTitle) {
    const tag = document.querySelector('meta[property="og:title"]')
    if (tag) {
      tag.setAttribute('content', ogTitle)
    }
  }
})

export default router
