import { apiRequest } from '@app/services/api/api-client'
import type {
  JsonResponse,
  UiPageCreateRequest,
  UiPageDetailRead,
  UiPageMetaRead,
  UiPageUpdateRequest,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const uiappApi = {
  async getPageDetail(appInstanceUuid: string, pageUuid: string): Promise<UiPageDetailRead> {
    const response = await apiRequest<JsonResponse<UiPageDetailRead>>(`/api/v1/uiapps/${appInstanceUuid}/pages/${pageUuid}`)
    return unwrap(response)
  },

  async createPage(appInstanceUuid: string, payload: UiPageCreateRequest): Promise<UiPageMetaRead> {
    const response = await apiRequest<JsonResponse<UiPageMetaRead>>(`/api/v1/uiapps/${appInstanceUuid}/pages`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async updatePage(appInstanceUuid: string, pageUuid: string, payload: UiPageUpdateRequest): Promise<UiPageDetailRead> {
    const response = await apiRequest<JsonResponse<UiPageDetailRead>>(`/api/v1/uiapps/${appInstanceUuid}/pages/${pageUuid}`, {
      method: 'PUT',
      body: payload,
    })
    return unwrap(response)
  },

  async deletePage(appInstanceUuid: string, pageUuid: string): Promise<void> {
    await apiRequest(`/api/v1/uiapps/${appInstanceUuid}/pages/${pageUuid}`, {
      method: 'DELETE',
    })
  },
}
