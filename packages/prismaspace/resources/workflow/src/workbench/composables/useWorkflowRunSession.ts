import { ref, type Ref } from 'vue'
import type { WorkflowInterruptRead } from '@prismaspace/contracts'

export type WorkflowRunAttachState = 'idle' | 'connecting' | 'attached' | 'replaying' | 'detached' | 'error'

export interface WorkflowRunSessionState {
  currentRunId: Ref<string | null>
  currentThreadId: Ref<string | null>
  currentSequence: Ref<number>
  currentStatus: Ref<string | null>
  attachState: Ref<WorkflowRunAttachState>
  interrupt: Ref<WorkflowInterruptRead | null>
  resumeInputText: Ref<string>
  scopeId: Ref<string | null>
  persistRunId: (runId: string | null) => void
  readPersistedRunId: () => string | null
  reset: () => void
}

export const useWorkflowRunSession = (storageKey: Ref<string | null>): WorkflowRunSessionState => {
  const currentRunId = ref<string | null>(null)
  const currentThreadId = ref<string | null>(null)
  const currentSequence = ref(0)
  const currentStatus = ref<string | null>(null)
  const attachState = ref<WorkflowRunAttachState>('idle')
  const interrupt = ref<WorkflowInterruptRead | null>(null)
  const resumeInputText = ref('{}')
  const scopeId = ref<string | null>(null)

  const persistRunId = (runId: string | null): void => {
    if (typeof window === 'undefined' || !storageKey.value) {
      return
    }
    if (runId) {
      window.localStorage.setItem(storageKey.value, runId)
      return
    }
    window.localStorage.removeItem(storageKey.value)
  }

  const readPersistedRunId = (): string | null => {
    if (typeof window === 'undefined' || !storageKey.value) {
      return null
    }
    return window.localStorage.getItem(storageKey.value)
  }

  const reset = (): void => {
    currentRunId.value = null
    currentThreadId.value = null
    currentSequence.value = 0
    currentStatus.value = null
    attachState.value = 'idle'
    interrupt.value = null
  }

  return {
    currentRunId,
    currentThreadId,
    currentSequence,
    currentStatus,
    attachState,
    interrupt,
    resumeInputText,
    scopeId,
    persistRunId,
    readPersistedRunId,
    reset,
  }
}
