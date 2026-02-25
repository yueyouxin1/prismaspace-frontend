import type { RouteRecordRaw } from 'vue-router'

export const billingRoutes: RouteRecordRaw[] = [
  {
    path: '/pricing',
    name: 'platform-pricing',
    component: () => import('@app/views/platform/PricingView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'billing',
      analyticsId: 'platform.pricing',
    },
  },
  {
    path: '/entitlements',
    name: 'platform-entitlements',
    component: () => import('@app/views/platform/EntitlementsView.vue'),
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'billing',
      analyticsId: 'platform.entitlements',
    },
  },
  {
    path: '/billing/checkout',
    name: 'billing-checkout',
    component: () => import('@app/views/platform/PlaceholderView.vue'),
    props: {
      titleKey: 'platform.pages.placeholders.billingCheckout.title',
      subtitleKey: 'platform.pages.placeholders.billingCheckout.subtitle',
      descriptionKey: 'platform.pages.placeholders.billingCheckout.description',
    },
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'billing',
      analyticsId: 'billing.checkout',
    },
  },
  {
    path: '/billing/result',
    name: 'billing-result',
    component: () => import('@app/views/platform/PlaceholderView.vue'),
    props: {
      titleKey: 'platform.pages.placeholders.billingResult.title',
      subtitleKey: 'platform.pages.placeholders.billingResult.subtitle',
      descriptionKey: 'platform.pages.placeholders.billingResult.description',
    },
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'billing',
      analyticsId: 'billing.result',
    },
  },
  {
    path: '/billing/invoices',
    name: 'billing-invoices',
    component: () => import('@app/views/platform/PlaceholderView.vue'),
    props: {
      titleKey: 'platform.pages.placeholders.billingInvoices.title',
      subtitleKey: 'platform.pages.placeholders.billingInvoices.subtitle',
      descriptionKey: 'platform.pages.placeholders.billingInvoices.description',
    },
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'billing',
      analyticsId: 'billing.invoices',
    },
  },
  {
    path: '/billing/usage',
    name: 'billing-usage',
    component: () => import('@app/views/platform/PlaceholderView.vue'),
    props: {
      titleKey: 'platform.pages.placeholders.billingUsage.title',
      subtitleKey: 'platform.pages.placeholders.billingUsage.subtitle',
      descriptionKey: 'platform.pages.placeholders.billingUsage.description',
    },
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'billing',
      analyticsId: 'billing.usage',
    },
  },
  {
    path: '/billing/payment-methods',
    name: 'billing-payment-methods',
    component: () => import('@app/views/platform/PlaceholderView.vue'),
    props: {
      titleKey: 'platform.pages.placeholders.billingPayments.title',
      subtitleKey: 'platform.pages.placeholders.billingPayments.subtitle',
      descriptionKey: 'platform.pages.placeholders.billingPayments.description',
    },
    meta: {
      layout: 'blank',
      requiresAuth: true,
      section: 'billing',
      analyticsId: 'billing.payment_methods',
    },
  },
]

