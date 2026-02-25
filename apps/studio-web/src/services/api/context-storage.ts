const ACCESS_TOKEN_KEY = 'prismaspace.session.access_token'
const WORKSPACE_UUID_KEY = 'prismaspace.session.workspace_uuid'

const readStorage = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(key)
}

const writeStorage = (key: string, value: string | null): void => {
  if (typeof window === 'undefined') {
    return
  }

  if (!value) {
    window.localStorage.removeItem(key)
    return
  }

  window.localStorage.setItem(key, value)
}

export const apiContextStorage = {
  getAccessToken(): string | null {
    return readStorage(ACCESS_TOKEN_KEY)
  },
  setAccessToken(token: string | null): void {
    writeStorage(ACCESS_TOKEN_KEY, token)
  },
  getWorkspaceUuid(): string | null {
    return readStorage(WORKSPACE_UUID_KEY)
  },
  setWorkspaceUuid(workspaceUuid: string | null): void {
    writeStorage(WORKSPACE_UUID_KEY, workspaceUuid)
  },
  clear(): void {
    writeStorage(ACCESS_TOKEN_KEY, null)
    writeStorage(WORKSPACE_UUID_KEY, null)
  },
}

