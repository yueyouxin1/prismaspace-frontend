import { pinia } from '@app/core/providers/pinia'
import { usePlatformStore } from '@app/stores/platform'
import type { ApiBusinessError } from '@app/types/saas'
import { HttpBusinessError, isHttpBusinessError } from '@app/services/http/business-error'

const normalizeError = (error: unknown): ApiBusinessError | null => {
  if (isHttpBusinessError(error)) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      actionText: error.actionText,
    }
  }

  if (error instanceof Error) {
    return {
      status: 429,
      code: 'unknown_error',
      message: error.message || '系统忙碌，请稍后重试。',
    }
  }

  return null
}

export const emitBusinessError = (error: unknown): void => {
  const normalized = normalizeError(error)
  if (!normalized) {
    return
  }

  const store = usePlatformStore(pinia)
  store.acceptError(normalized)
}

export const throwBusinessError = (payload: ApiBusinessError): never => {
  throw new HttpBusinessError(payload)
}
