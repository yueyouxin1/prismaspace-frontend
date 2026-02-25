import type { ApiBusinessError, HttpBusinessStatus } from '@app/types/saas'

export class HttpBusinessError extends Error implements ApiBusinessError {
  status: HttpBusinessStatus
  code: string
  actionText?: string

  constructor(payload: ApiBusinessError) {
    super(payload.message)
    this.name = 'HttpBusinessError'
    this.status = payload.status
    this.code = payload.code
    this.actionText = payload.actionText
  }
}

export const isHttpBusinessError = (error: unknown): error is HttpBusinessError => {
  return error instanceof HttpBusinessError
}
