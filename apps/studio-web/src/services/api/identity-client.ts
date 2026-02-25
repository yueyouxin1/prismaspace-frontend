import { apiRequest } from '@app/services/api/api-client'
import type {
  JsonResponse,
  TokenRead,
  TokenRequest,
  UserCreateRequest,
  UserRead,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const identityApi = {
  async register(payload: UserCreateRequest): Promise<UserRead> {
    const response = await apiRequest<JsonResponse<UserRead>>('/api/v1/identity/register', {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async login(payload: TokenRequest): Promise<TokenRead> {
    const response = await apiRequest<JsonResponse<TokenRead>>('/api/v1/identity/token', {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async getCurrentUser(): Promise<UserRead> {
    const response = await apiRequest<JsonResponse<UserRead>>('/api/v1/identity/users/me')
    return unwrap(response)
  },
}

