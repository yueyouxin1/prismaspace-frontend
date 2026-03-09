import { HttpBusinessError, type HttpBusinessStatus } from './errors'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiRequestOptions {
  method?: HttpMethod
  query?: Record<string, string | number | boolean | null | undefined>
  body?: unknown
  headers?: Record<string, string>
}

export interface ClientOptions {
  baseUrl: string
  getAccessToken?: () => string | null
  getApiKey?: () => string | null
  getWorkspaceUuid?: () => string | null
  locale?: string
  fetchImpl?: typeof fetch
  onUnauthorized?: () => void
  defaultHeaders?: Record<string, string>
}

interface ApiErrorPayload {
  code?: string
  message?: string
  actionText?: string
  detail?: unknown
  msg?: string
}

export interface ClientTransport {
  readonly fetchImpl: typeof fetch
  readonly config: {
    readonly locale: string
  }
  request: <T>(path: string, options?: ApiRequestOptions) => Promise<T>
  buildUrl: (path: string, query?: ApiRequestOptions['query']) => string
  buildHeaders: (headers?: Record<string, string>) => Record<string, string>
}

const defaultMessageByStatus: Record<number, string> = {
  400: 'Request validation failed.',
  401: 'Authentication required.',
  402: 'Insufficient quota or balance.',
  403: 'Permission denied.',
  404: 'Resource not found.',
  409: 'Request conflict.',
  422: 'Request payload is invalid.',
  429: 'Too many requests.',
  500: 'Service unavailable.',
  502: 'Gateway error.',
  503: 'Service unavailable.',
  504: 'Gateway timeout.',
}

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
const normalizePath = (path: string): string => path.startsWith('/') ? path : `/${path}`

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

  return search.size ? `${path}?${search.toString()}` : path
}

const parseErrorPayload = async (response: Response): Promise<ApiErrorPayload | null> => {
  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    return null
  }

  try {
    return (await response.json()) as ApiErrorPayload
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
  return status >= 500 ? 500 : 400
}

export const createTransport = (options: ClientOptions): ClientTransport => {
  const fetchImpl = options.fetchImpl ?? fetch
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const locale = options.locale ?? 'zh-CN'

  const buildHeaders = (headers: Record<string, string> = {}): Record<string, string> => {
    const merged: Record<string, string> = {
      Accept: 'application/json',
      ...options.defaultHeaders,
      ...headers,
    }

    const accessToken = options.getAccessToken?.()
    if (accessToken && !merged.Authorization) {
      merged.Authorization = `Bearer ${accessToken}`
    }

    const apiKey = options.getApiKey?.()
    if (apiKey && !merged['X-API-Key']) {
      merged['X-API-Key'] = apiKey
    }

    const workspaceUuid = options.getWorkspaceUuid?.()
    if (workspaceUuid && !merged['X-Workspace-UUID']) {
      merged['X-Workspace-UUID'] = workspaceUuid
    }

    if (!merged['Accept-Language']) {
      merged['Accept-Language'] = locale
    }

    return merged
  }

  const buildUrl = (path: string, query?: ApiRequestOptions['query']): string => {
    return `${baseUrl}${withQuery(normalizePath(path), query)}`
  }

  const request = async <T>(path: string, requestOptions: ApiRequestOptions = {}): Promise<T> => {
    const headers = buildHeaders(requestOptions.headers)
    if (requestOptions.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetchImpl(buildUrl(path, requestOptions.query), {
      method: requestOptions.method ?? 'GET',
      headers,
      body: requestOptions.body === undefined ? undefined : JSON.stringify(requestOptions.body),
    })

    if (!response.ok) {
      const payload = await parseErrorPayload(response)
      const normalizedStatus = normalizeErrorStatus(response.status)
      const message =
        payload?.message ||
        payload?.msg ||
        toDetailMessage(payload?.detail) ||
        defaultMessageByStatus[response.status] ||
        defaultMessageByStatus[normalizedStatus] ||
        `Request failed (${response.status})`

      if (normalizedStatus === 401) {
        options.onUnauthorized?.()
      }

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

  return {
    fetchImpl,
    config: {
      locale,
    },
    request,
    buildUrl,
    buildHeaders,
  }
}
