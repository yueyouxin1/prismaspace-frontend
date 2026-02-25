import { withBusinessHandling } from '@app/services/http/request'
import { throwBusinessError } from '@app/services/http/error-gateway'
import { checkoutScenarios, dashboardScenarios, projectsScenarios } from '@app/data/saas/contracts'
import type { ApiBusinessError } from '@app/types/saas'

const sleep = async (duration = 420): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, duration)
  })

const maybeThrow = (scenario: string | null): void => {
  const map: Record<string, ApiBusinessError> = {
    '401': {
      status: 401,
      code: 'unauthorized',
      message: '请先登录后继续访问。',
      actionText: '去登录',
    },
    '402': dashboardScenarios.failure,
    '403': checkoutScenarios.failure,
    '429': projectsScenarios.failure,
  }

  if (!scenario || !map[scenario]) {
    return
  }

  throwBusinessError(map[scenario])
}

export const fetchDashboardSnapshot = async (scenario: string | null) => {
  return withBusinessHandling(async () => {
    await sleep()
    maybeThrow(scenario)
    return dashboardScenarios.success
  })
}

export const requestCheckout = async (scenario: string | null) => {
  return withBusinessHandling(async () => {
    await sleep()
    maybeThrow(scenario)
    return checkoutScenarios.success
  })
}

export const fetchProjectsMeta = async (scenario: string | null) => {
  return withBusinessHandling(async () => {
    await sleep()
    maybeThrow(scenario)
    return projectsScenarios.success
  })
}
