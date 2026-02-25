import { apiRequest } from '@app/services/api/api-client'
import type { JsonResponse, ProductReadFull } from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const productApi = {
  async listPublicProducts(): Promise<ProductReadFull[]> {
    const response = await apiRequest<JsonResponse<ProductReadFull[]>>('/api/v1/products/public')
    return unwrap(response)
  },
}

