import type { RouteRecordRaw } from 'vue-router'
import { accountRoutes } from '@app/router/routes/account.routes'
import { authRoutes } from '@app/router/routes/auth.routes'
import { billingRoutes } from '@app/router/routes/billing.routes'
import { componentsRoutes } from '@app/router/routes/components.routes'
import { consoleRoutes } from '@app/router/routes/console.routes'
import { homeRoutes } from '@app/router/routes/home.routes'
import { settingsRoutes } from '@app/router/routes/settings.routes'
import { workbenchRoutes } from '@app/router/routes/workbench.routes'

export const routes: RouteRecordRaw[] = [
  ...homeRoutes,
  ...consoleRoutes,
  ...workbenchRoutes,
  ...billingRoutes,
  ...accountRoutes,
  ...settingsRoutes,
  ...authRoutes,
  ...componentsRoutes,
]
