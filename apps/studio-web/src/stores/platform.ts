import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiContextStorage } from '@app/services/api/context-storage'
import { identityApi } from '@app/services/api/identity-client'
import { teamApi } from '@app/services/api/team-client'
import { workspaceApi } from '@app/services/api/workspace-client'
import type { TeamRead, UserRead, WorkspaceRead } from '@app/services/api/contracts'
import { isHttpBusinessError } from '@app/services/http/business-error'
import type { ApiBusinessError } from '@app/types/saas'

const sessionStorageKey = 'prismaspace.session.v2'
const sessionMaxAgeMs = 1000 * 60 * 60 * 8

interface PersistedSession {
  accessToken: string
  expiresAt: string
  user: UserRead
  currentTeamId?: string | null
  currentWorkspaceId?: string | null
}

export const usePlatformStore = defineStore('platform', () => {
  const hydrated = ref(false)
  const loading = ref(false)

  const accessToken = ref<string | null>(null)
  const expiresAt = ref<string | null>(null)
  const user = ref<UserRead | null>(null)

  const teams = ref<TeamRead[]>([])
  const workspaces = ref<WorkspaceRead[]>([])
  const currentTeamId = ref<string | null>(null)
  const currentWorkspaceId = ref<string | null>(null)

  const latestError = ref<ApiBusinessError | null>(null)

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value))

  const sessionExpired = computed(() => {
    if (!expiresAt.value) {
      return false
    }

    return Date.parse(expiresAt.value) <= Date.now()
  })

  const currentTeam = computed(() => teams.value.find((team) => team.uuid === currentTeamId.value) ?? null)
  const currentWorkspace = computed(
    () => workspaces.value.find((workspace) => workspace.uuid === currentWorkspaceId.value) ?? null,
  )

  const syncWorkspaceContext = (workspaceUuid: string | null): void => {
    currentWorkspaceId.value = workspaceUuid
    apiContextStorage.setWorkspaceUuid(workspaceUuid)
  }

  const persistSession = (): void => {
    if (!accessToken.value || !expiresAt.value || !user.value) {
      localStorage.removeItem(sessionStorageKey)
      return
    }

    const payload: PersistedSession = {
      accessToken: accessToken.value,
      expiresAt: expiresAt.value,
      user: user.value,
      currentTeamId: currentTeamId.value,
      currentWorkspaceId: currentWorkspaceId.value,
    }

    localStorage.setItem(sessionStorageKey, JSON.stringify(payload))
  }

  const clearSession = (): void => {
    accessToken.value = null
    expiresAt.value = null
    user.value = null
    teams.value = []
    workspaces.value = []
    currentTeamId.value = null
    syncWorkspaceContext(null)
    apiContextStorage.clear()
    localStorage.removeItem(sessionStorageKey)
  }

  const applySession = (payload: { accessToken: string; expiresAt: string; user: UserRead }): void => {
    accessToken.value = payload.accessToken
    expiresAt.value = payload.expiresAt
    user.value = payload.user
    apiContextStorage.setAccessToken(payload.accessToken)
    persistSession()
  }

  const selectInitialWorkspace = (): void => {
    if (currentWorkspaceId.value && workspaces.value.some((workspace) => workspace.uuid === currentWorkspaceId.value)) {
      syncWorkspaceContext(currentWorkspaceId.value)
      return
    }

    const cachedWorkspaceUuid = apiContextStorage.getWorkspaceUuid()
    const cachedWorkspace = cachedWorkspaceUuid
      ? workspaces.value.find((workspace) => workspace.uuid === cachedWorkspaceUuid)
      : null

    const nextWorkspace = cachedWorkspace ?? workspaces.value[0] ?? null
    syncWorkspaceContext(nextWorkspace?.uuid ?? null)
  }

  const alignCurrentTeamWithWorkspace = (): void => {
    const selectedWorkspace = currentWorkspace.value
    if (!selectedWorkspace) {
      currentTeamId.value = teams.value[0]?.uuid ?? null
      return
    }

    if (selectedWorkspace.owner.type === 'team') {
      currentTeamId.value = selectedWorkspace.owner.uuid
      return
    }

    currentTeamId.value = teams.value[0]?.uuid ?? null
  }

  const loadPlatformContext = async (): Promise<void> => {
    if (!isAuthenticated.value || loading.value) {
      return
    }

    loading.value = true
    try {
      const [teamList, workspaceList] = await Promise.all([teamApi.listTeams(), workspaceApi.listWorkspaces()])
      teams.value = teamList
      workspaces.value = workspaceList
      selectInitialWorkspace()
      alignCurrentTeamWithWorkspace()
      persistSession()
    } catch (error) {
      if (isHttpBusinessError(error)) {
        acceptError({
          status: error.status,
          code: error.code,
          message: error.message,
          actionText: error.actionText,
        })
      }
      throw error
    } finally {
      loading.value = false
    }
  }

  const hydrate = (): void => {
    if (hydrated.value) {
      return
    }

    hydrated.value = true

    const raw = localStorage.getItem(sessionStorageKey)
    if (!raw) {
      return
    }

    try {
      const parsed = JSON.parse(raw) as PersistedSession
      accessToken.value = parsed.accessToken
      expiresAt.value = parsed.expiresAt
      user.value = parsed.user
      currentTeamId.value = parsed.currentTeamId ?? null
      syncWorkspaceContext(parsed.currentWorkspaceId ?? null)
      apiContextStorage.setAccessToken(parsed.accessToken)
    } catch {
      clearSession()
    }
  }

  const signInWithPassword = async (account: string, password: string): Promise<void> => {
    try {
      const tokenData = await identityApi.login({
        grant_type: 'password',
        identifier: account,
        password,
      })

      apiContextStorage.setAccessToken(tokenData.access_token)
      const profile = await identityApi.getCurrentUser()

      applySession({
        accessToken: tokenData.access_token,
        expiresAt: new Date(Date.now() + sessionMaxAgeMs).toISOString(),
        user: profile,
      })

      await loadPlatformContext()
    } catch (error) {
      if (isHttpBusinessError(error)) {
        acceptError({
          status: error.status,
          code: error.code,
          message: error.message,
          actionText: error.actionText,
        })
      }
      throw error
    }
  }

  const signOut = (): void => {
    clearSession()
  }

  const markSessionExpired = (): void => {
    latestError.value = {
      status: 401,
      code: 'session_expired',
      message: '登录状态已过期，请重新登录。',
      actionText: '重新登录',
    }
    clearSession()
  }

  const acceptError = (error: ApiBusinessError): void => {
    latestError.value = error
    if (error.status === 401) {
      clearSession()
    }
  }

  const clearError = (): void => {
    latestError.value = null
  }

  const switchTeam = (teamUuid: string): void => {
    const selectedTeam = teams.value.find((team) => team.uuid === teamUuid)
    if (!selectedTeam) {
      return
    }

    currentTeamId.value = selectedTeam.uuid
    const teamWorkspace = workspaces.value.find(
      (workspace) => workspace.owner.type === 'team' && workspace.owner.uuid === selectedTeam.uuid,
    )
    if (teamWorkspace) {
      syncWorkspaceContext(teamWorkspace.uuid)
    }
    persistSession()
  }

  const switchWorkspace = (workspaceUuid: string): void => {
    const selectedWorkspace = workspaces.value.find((workspace) => workspace.uuid === workspaceUuid)
    if (!selectedWorkspace) {
      return
    }

    syncWorkspaceContext(selectedWorkspace.uuid)
    if (selectedWorkspace.owner.type === 'team') {
      currentTeamId.value = selectedWorkspace.owner.uuid
    }
    persistSession()
  }

  return {
    accessToken,
    expiresAt,
    user,
    teams,
    workspaces,
    currentTeamId,
    currentWorkspaceId,
    currentTeam,
    currentWorkspace,
    latestError,
    isAuthenticated,
    sessionExpired,
    loading,
    hydrate,
    loadPlatformContext,
    signInWithPassword,
    signOut,
    markSessionExpired,
    acceptError,
    clearError,
    switchTeam,
    switchWorkspace,
  }
})
