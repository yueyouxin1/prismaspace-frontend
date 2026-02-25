import { apiRequest } from '@app/services/api/api-client'
import type { EntitlementBalanceRead, JsonResponse } from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const entitlementApi = {
  async listMyEntitlements(): Promise<EntitlementBalanceRead[]> {
    const response = await apiRequest<JsonResponse<EntitlementBalanceRead[]>>('/api/v1/entitlements/me')
    return unwrap(response)
  },

  async listTeamEntitlements(teamUuid: string): Promise<EntitlementBalanceRead[]> {
    const response = await apiRequest<JsonResponse<EntitlementBalanceRead[]>>(`/api/v1/entitlements/teams/${teamUuid}`)
    return unwrap(response)
  },
}

