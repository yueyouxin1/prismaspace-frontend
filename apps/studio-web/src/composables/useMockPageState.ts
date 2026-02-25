import { computed } from 'vue'
import { useRoute } from 'vue-router'

export const useMockPageState = () => {
  const route = useRoute()

  const state = computed(() => {
    const raw = route.query.state
    const value = Array.isArray(raw) ? raw[0] : raw

    if (value === 'loading' || value === 'empty' || value === 'error') {
      return value
    }

    return 'success'
  })

  const scenario = computed(() => {
    const raw = route.query.error
    const value = Array.isArray(raw) ? raw[0] : raw
    if (typeof value === 'string') {
      return value
    }

    return null
  })

  return {
    state,
    scenario,
  }
}
