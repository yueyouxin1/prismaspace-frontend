type AnalyticsPayload = Record<string, string | number | boolean>

interface AnalyticsEvent {
  name: string
  payload: AnalyticsPayload
  at: string
}

const key = 'prismaspace.analytics.events'

export const trackEvent = (name: string, payload: AnalyticsPayload = {}): void => {
  const entry: AnalyticsEvent = {
    name,
    payload,
    at: new Date().toISOString(),
  }

  try {
    const raw = localStorage.getItem(key)
    const list = raw ? (JSON.parse(raw) as AnalyticsEvent[]) : []
    localStorage.setItem(key, JSON.stringify([entry, ...list].slice(0, 100)))
  } catch {
    // localStorage 不可用时静默降级，避免影响主流程。
  }
}
