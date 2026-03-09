import type { ClientTransport } from '../transport'

export interface PrismaspaceClientConfig {
  locale: string
}

export interface SdkContext {
  transport: ClientTransport
  config: PrismaspaceClientConfig
}
