import type { RouteRecordRaw } from 'vue-router'

export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/auth/sign-in',
    name: 'auth-sign-in',
    component: () => import('@app/views/auth/SignInView.vue'),
    meta: {
      layout: 'auth',
      section: 'auth',
      analyticsId: 'auth.sign_in',
      seo: {
        title: '登录 PrismaSpace',
        description: '登录并继续你的 AI 产品创作流程。',
      },
    },
  },
  {
    path: '/auth/sign-up',
    name: 'auth-sign-up',
    component: () => import('@app/views/auth/SignUpView.vue'),
    meta: {
      layout: 'auth',
      section: 'auth',
      analyticsId: 'auth.sign_up',
      seo: {
        title: '注册 PrismaSpace',
        description: '创建账户并开始使用模板市场与协作能力。',
      },
    },
  },
  {
    path: '/auth/forgot-password',
    name: 'auth-forgot-password',
    component: () => import('@app/views/auth/ForgotPasswordView.vue'),
    meta: {
      layout: 'auth',
      section: 'auth',
      analyticsId: 'auth.forgot_password',
    },
  },
  {
    path: '/auth/reset-password',
    name: 'auth-reset-password',
    component: () => import('@app/views/auth/ResetPasswordView.vue'),
    meta: {
      layout: 'auth',
      section: 'auth',
      analyticsId: 'auth.reset_password',
    },
  },
  {
    path: '/auth/email-verify-result',
    name: 'auth-email-verify-result',
    component: () => import('@app/views/auth/EmailVerifyResultView.vue'),
    meta: {
      layout: 'auth',
      section: 'auth',
      analyticsId: 'auth.email_verify_result',
    },
  },
]
