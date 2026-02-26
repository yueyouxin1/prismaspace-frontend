import { connectSseStream, type SseConnectOptions, type SseConnection } from '@repo/common'
import { apiContextStorage } from '@app/services/api/context-storage'

export interface ApiSseConnectOptions extends Omit<SseConnectOptions, 'url' | 'headers'> {
  path: string
  query?: Record<string, string | number | boolean | null | undefined>
  headers?: Record<string, string>
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

const withQuery = (path: string, query?: ApiSseConnectOptions['query']): string => {
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

export const connectApiSseStream = async (options: ApiSseConnectOptions): Promise<SseConnection> => {
  const { path, query, headers: customHeaders, ...rest } = options
  const url = `${resolveBaseUrl()}${withQuery(normalizePath(path), query)}`

  const headers: Record<string, string> = {
    ...customHeaders,
  }

  const accessToken = apiContextStorage.getAccessToken()
  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const workspaceUuid = apiContextStorage.getWorkspaceUuid()
  if (workspaceUuid && !headers['X-Workspace-UUID']) {
    headers['X-Workspace-UUID'] = workspaceUuid
  }

  return connectSseStream({
    ...rest,
    url,
    headers,
  })
}
