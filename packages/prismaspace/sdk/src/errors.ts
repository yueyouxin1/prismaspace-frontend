export type HttpBusinessStatus = 400 | 401 | 402 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503 | 504

export interface ApiBusinessError {
  status: HttpBusinessStatus
  code: string
  message: string
  actionText?: string
}

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
