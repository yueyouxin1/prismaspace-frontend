import type {
  JsonResponse,
  UiPageCreateRequest,
  UiPageDetailRead,
  UiPageMetaRead,
  UiPageUpdateRequest,
} from '@prismaspace/contracts'
import type { SdkContext } from './types'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface UiAppClient {
  getPageDetail: (appInstanceUuid: string, pageUuid: string) => Promise<UiPageDetailRead>
  createPage: (appInstanceUuid: string, payload: UiPageCreateRequest) => Promise<UiPageMetaRead>
  updatePage: (appInstanceUuid: string, pageUuid: string, payload: UiPageUpdateRequest) => Promise<UiPageDetailRead>
  deletePage: (appInstanceUuid: string, pageUuid: string) => Promise<void>
}

export const createUiAppClient = (context: SdkContext): UiAppClient => ({
  async getPageDetail(appInstanceUuid, pageUuid) {
    return unwrap(await context.transport.request<JsonResponse<UiPageDetailRead>>(`/api/v1/uiapps/${appInstanceUuid}/pages/${pageUuid}`))
  },
  async createPage(appInstanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<UiPageMetaRead>>(`/api/v1/uiapps/${appInstanceUuid}/pages`, {
      method: 'POST',
      body: payload,
    }))
  },
  async updatePage(appInstanceUuid, pageUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<UiPageDetailRead>>(`/api/v1/uiapps/${appInstanceUuid}/pages/${pageUuid}`, {
      method: 'PUT',
      body: payload,
    }))
  },
  async deletePage(appInstanceUuid, pageUuid) {
    await context.transport.request(`/api/v1/uiapps/${appInstanceUuid}/pages/${pageUuid}`, { method: 'DELETE' })
  },
})
