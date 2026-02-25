import { ref } from 'vue'

export const useSubmitGuard = () => {
  const submitting = ref(false)

  const runWithGuard = async (task: () => Promise<void>): Promise<void> => {
    if (submitting.value) {
      return
    }

    submitting.value = true
    try {
      await task()
    } finally {
      submitting.value = false
    }
  }

  return {
    submitting,
    runWithGuard,
  }
}
