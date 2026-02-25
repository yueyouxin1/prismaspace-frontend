import { apiContextStorage } from '@app/services/api/context-storage'
import { HttpBusinessError } from '@app/services/http/business-error'
import type { HttpBusinessStatus } from '@app/types/saas'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiRequestOptions {
  method?: HttpMethod
  query?: Record<string, string | number | boolean | null | undefined>
  body?: unknown
  headers?: Record<string, string>
}

interface ApiErrorPayload {
  code?: string
  message?: string
  actionText?: string
  detail?: unknown
  msg?: string
}

const withQuery = (path: string, query?: ApiRequestOptions['query']): string => {
  if (!query) {
    return path
  }

  const search = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return
    }

    search.set(key, String(value))
  })

  if (!search.size) {
    return path
  }

  return `${path}?${search.toString()}`
}

const resolveBaseUrl = (): string => {
  const base = import.meta.env.APP_API_BASE_URL
  if (typeof base !== 'string') {
    return ''
  }

  return base.endsWith('/') ? base.slice(0, -1) : base
}

const normalizePath = (path: string): string => {
  if (path.startsWith('/')) {
    return path
  }

  return `/${path}`
}

const defaultMessageByStatus: Record<number, string> = {
  400: '请求参数错误，请检查后重试。',
  401: '登录状态已失效，请重新登录。',
  402: '当前工作空间额度不足，请升级或充值后重试。',
  403: '当前账号没有权限执行该操作。',
  404: '目标资源不存在或已删除。',
  409: '请求发生冲突，请刷新后重试。',
  422: '请求参数校验失败，请检查输入项。',
  429: '请求过于频繁，请稍后再试。',
  500: '服务暂时不可用，请稍后重试。',
  502: '网关错误，请稍后重试。',
  503: '服务维护中，请稍后重试。',
  504: '服务响应超时，请稍后重试。',
}

const parseErrorPayload = async (response: Response): Promise<ApiErrorPayload | null> => {
  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    return null
  }

  try {
    const payload = (await response.json()) as ApiErrorPayload
    return payload
  } catch {
    return null
  }
}

const toDetailMessage = (detail: unknown): string | null => {
  if (!detail) {
    return null
  }

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    if (first && typeof first === 'object' && 'msg' in first && typeof first.msg === 'string') {
      return first.msg
    }
  }

  return null
}

const normalizeErrorStatus = (status: number): HttpBusinessStatus => {
  if (status in defaultMessageByStatus) {
    return status as HttpBusinessStatus
  }

  if (status >= 500) {
    return 500
  }

  return 400
}

export const apiRequest = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const base = resolveBaseUrl()
  const pathname = normalizePath(path)
  const url = `${base}${withQuery(pathname, options.query)}`

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  }

  const accessToken = apiContextStorage.getAccessToken()
  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const workspaceUuid = apiContextStorage.getWorkspaceUuid()
  if (workspaceUuid && !headers['X-Workspace-UUID']) {
    headers['X-Workspace-UUID'] = workspaceUuid
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const payload = await parseErrorPayload(response)
    const detailMessage = toDetailMessage(payload?.detail)
    const normalizedStatus = normalizeErrorStatus(response.status)
    const message =
      payload?.message ||
      payload?.msg ||
      detailMessage ||
      defaultMessageByStatus[response.status] ||
      defaultMessageByStatus[normalizedStatus] ||
      `请求失败（${response.status}）`

    throw new HttpBusinessError({
      status: normalizedStatus,
      code: payload?.code ?? `http_${response.status}`,
      message,
      actionText: payload?.actionText,
    })
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
