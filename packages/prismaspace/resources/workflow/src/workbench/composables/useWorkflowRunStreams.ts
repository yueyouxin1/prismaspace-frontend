import { computed, ref, type Ref } from 'vue'
import type { SseConnection } from '@prismaspace/common'
import type {
  WorkflowEventRead,
  WorkflowRunRead,
  WorkflowRunSummaryRead,
  WorkflowStreamEvent,
} from '@prismaspace/contracts'
import type { PrismaspaceClient } from '@prismaspace/sdk'
import type { WorkflowRunSessionState } from './useWorkflowRunSession'

export type WorkflowEventFeedMode = 'history' | 'live' | 'replay'

export interface WorkflowRunStreamsOptions {
  client: PrismaspaceClient
  instanceUuid: Ref<string | null>
  selectedRunId: Ref<string | null>
  runSession: WorkflowRunSessionState
  invalidateQueries: () => Promise<void>
  setWorkbenchError: (message: string | null) => void
  onError?: (error: unknown) => void
  openTestRunPanel?: () => void
}

const toEventRead = (event: WorkflowStreamEvent, fallbackSeq: number): WorkflowEventRead => ({
  sequence_no: typeof event.seq === 'number' ? event.seq : fallbackSeq,
  event_type: event.type,
  payload: event.payload,
  created_at: typeof event.ts === 'string' ? event.ts : new Date().toISOString(),
})

export const useWorkflowRunStreams = ({
  client,
  instanceUuid,
  selectedRunId,
  runSession,
  invalidateQueries,
  setWorkbenchError,
  onError,
  openTestRunPanel,
}: WorkflowRunStreamsOptions) => {
  const liveConnection = ref<SseConnection | null>(null)
  const replayConnection = ref<SseConnection | null>(null)
  const liveRunEvents = ref<WorkflowEventRead[]>([])
  const replayRunId = ref<string | null>(null)
  const replayRunEvents = ref<WorkflowEventRead[]>([])
  const streamFeedMode = ref<WorkflowEventFeedMode>('history')

  const liveRunId = runSession.currentRunId
  const liveThreadId = runSession.currentThreadId
  const liveLastSeq = runSession.currentSequence
  const liveRunStatus = runSession.currentStatus
  const runAttachState = runSession.attachState
  const liveInterrupt = runSession.interrupt

  const isLiveRunning = computed(() =>
    Boolean(liveConnection.value) && (!liveRunStatus.value || liveRunStatus.value === 'running'),
  )

  const closeLiveConnection = (): void => {
    liveConnection.value?.close()
    liveConnection.value = null
  }

  const closeReplayConnection = (): void => {
    replayConnection.value?.close()
    replayConnection.value = null
  }

  const resetLiveState = (): void => {
    runSession.reset()
    liveRunEvents.value = []
  }

  const resetReplayState = (): void => {
    replayRunId.value = null
    replayRunEvents.value = []
    if (streamFeedMode.value === 'replay') {
      streamFeedMode.value = 'history'
    }
  }

  const closeAllStreams = (): void => {
    closeLiveConnection()
    closeReplayConnection()
  }

  const resetAllStreams = (options?: { clearPersistedRunId?: boolean }): void => {
    closeAllStreams()
    resetLiveState()
    resetReplayState()
    runAttachState.value = 'idle'
    if (options?.clearPersistedRunId) {
      runSession.persistRunId(null)
    }
  }

  const reportError = (message: string, error?: unknown): void => {
    setWorkbenchError(message)
    if (error !== undefined) {
      onError?.(error)
    }
  }

  const appendLiveEvent = (event: WorkflowStreamEvent): void => {
    const parsedSeq = typeof event.seq === 'number' ? event.seq : Number.NaN
    const nextSeq = Number.isFinite(parsedSeq) ? parsedSeq : liveLastSeq.value + 1
    liveLastSeq.value = Math.max(liveLastSeq.value, nextSeq)
    liveRunEvents.value = [
      ...liveRunEvents.value,
      toEventRead(event, nextSeq),
    ]
  }

  const appendReplayEvent = (event: WorkflowStreamEvent): void => {
    replayRunEvents.value = [
      ...replayRunEvents.value,
      toEventRead(event, replayRunEvents.value.length + 1),
    ]
  }

  const finalizeLiveStream = async (): Promise<void> => {
    closeLiveConnection()
    runSession.persistRunId(null)
    runAttachState.value = liveRunStatus.value === 'failed' ? 'error' : 'detached'
    await invalidateQueries()
  }

  const handleWorkflowStreamEvent = (event: WorkflowStreamEvent): void => {
    appendLiveEvent(event)

    if (event.type === 'session.ready') {
      if (streamFeedMode.value === 'live') {
        runAttachState.value = 'connecting'
      }
      return
    }

    if (event.type === 'run.attached') {
      runAttachState.value = 'attached'
      return
    }

    if (event.type === 'run.started') {
      const runId = typeof event.runId === 'string' ? event.runId : liveRunId.value
      const threadId = typeof event.threadId === 'string' ? event.threadId : liveThreadId.value
      if (runId) {
        liveRunId.value = runId
        selectedRunId.value = runId
        runSession.persistRunId(runId)
      }
      liveThreadId.value = threadId ?? null
      liveRunStatus.value = 'running'
      liveInterrupt.value = null
      streamFeedMode.value = 'live'
      runAttachState.value = 'attached'
      return
    }

    if (event.type === 'run.interrupted') {
      liveRunStatus.value = 'interrupted'
      liveInterrupt.value = typeof event.payload.interrupt === 'object' && event.payload.interrupt
        ? (event.payload.interrupt as NonNullable<WorkflowRunRead['interrupt']>)
        : (liveInterrupt.value ?? null)
      void finalizeLiveStream()
      return
    }

    if (event.type === 'run.failed') {
      liveRunStatus.value = 'failed'
      void finalizeLiveStream()
      return
    }

    if (event.type === 'run.cancelled') {
      liveRunStatus.value = 'cancelled'
      void finalizeLiveStream()
      return
    }

    if (event.type === 'run.finished') {
      const outcome = typeof event.payload.outcome === 'string' ? event.payload.outcome : 'success'
      liveRunStatus.value = outcome === 'cancelled' ? 'cancelled' : 'succeeded'
      void finalizeLiveStream()
    }
  }

  const handleReplayStreamEvent = (event: WorkflowStreamEvent): void => {
    appendReplayEvent(event)
    if (event.type === 'session.ready') {
      runAttachState.value = 'replaying'
      return
    }
    if (event.type === 'run.replay.completed') {
      closeReplayConnection()
      runAttachState.value = 'idle'
    }
  }

  const startLiveRunStream = async (runId: string, afterSeq = 0): Promise<void> => {
    closeReplayConnection()
    resetReplayState()
    closeLiveConnection()
    streamFeedMode.value = 'live'
    runAttachState.value = 'connecting'
    liveRunId.value = runId
    selectedRunId.value = runId
    liveRunStatus.value = 'running'
    runSession.persistRunId(runId)
    if (afterSeq <= 0) {
      liveRunEvents.value = []
      liveLastSeq.value = 0
    } else {
      liveLastSeq.value = afterSeq
    }
    liveConnection.value = await client.workflow.attachLiveRun(
      runId,
      {
        onEvent: handleWorkflowStreamEvent,
        onServerError: (message) => {
          setWorkbenchError(message)
          liveRunStatus.value = 'failed'
          void finalizeLiveStream()
        },
        onError: (error) => {
          reportError(
            error instanceof Error ? error.message : '连接工作流实时流失败。',
            error,
          )
          liveRunStatus.value = 'failed'
          runAttachState.value = 'error'
          void finalizeLiveStream()
        },
      },
      afterSeq,
    )
  }

  const startReplayRunStream = async (runId: string): Promise<void> => {
    closeLiveConnection()
    closeReplayConnection()
    streamFeedMode.value = 'replay'
    runAttachState.value = 'replaying'
    replayRunId.value = runId
    replayRunEvents.value = []
    replayConnection.value = await client.workflow.replayRunStream(runId, {
      onEvent: handleReplayStreamEvent,
      onServerError: (message) => {
        setWorkbenchError(message)
        runAttachState.value = 'error'
        closeReplayConnection()
      },
      onError: (error) => {
        reportError(
          error instanceof Error ? error.message : '回放工作流事件流失败。',
          error,
        )
        runAttachState.value = 'error'
        closeReplayConnection()
      },
    })
  }

  const startWorkflowExecutionStream = async (payload: Record<string, unknown>): Promise<void> => {
    if (!instanceUuid.value) {
      throw new Error('未找到 workspace instance uuid。')
    }
    closeReplayConnection()
    resetReplayState()
    closeLiveConnection()
    resetLiveState()
    openTestRunPanel?.()
    setWorkbenchError(null)
    streamFeedMode.value = 'live'
    runAttachState.value = 'connecting'
    liveConnection.value = await client.workflow.streamExecute(instanceUuid.value, {
      inputs: payload,
    }, {
      onEvent: handleWorkflowStreamEvent,
      onServerError: (message) => {
        setWorkbenchError(message)
        liveRunStatus.value = 'failed'
        void finalizeLiveStream()
      },
      onError: (error) => {
        reportError(
          error instanceof Error ? error.message : '启动工作流流式执行失败。',
          error,
        )
        liveRunStatus.value = 'failed'
        runAttachState.value = 'error'
        void finalizeLiveStream()
      },
    })
  }

  const startWorkflowResumeStream = async (runId: string, payload: Record<string, unknown>): Promise<void> => {
    if (!instanceUuid.value) {
      throw new Error('未找到 workspace instance uuid。')
    }
    closeReplayConnection()
    resetReplayState()
    closeLiveConnection()
    resetLiveState()
    openTestRunPanel?.()
    setWorkbenchError(null)
    selectedRunId.value = runId
    streamFeedMode.value = 'live'
    runAttachState.value = 'connecting'
    liveConnection.value = await client.workflow.resumeRun(instanceUuid.value, runId, {
      output: payload,
    }, {
      onEvent: handleWorkflowStreamEvent,
      onServerError: (message) => {
        setWorkbenchError(message)
        liveRunStatus.value = 'failed'
        runAttachState.value = 'error'
        void finalizeLiveStream()
      },
      onError: (error) => {
        reportError(
          error instanceof Error ? error.message : '恢复工作流执行失败。',
          error,
        )
        liveRunStatus.value = 'failed'
        runAttachState.value = 'error'
        void finalizeLiveStream()
      },
    })
  }

  const startWorkflowDebugStream = async (nodeId: string, payload: Record<string, unknown>): Promise<void> => {
    if (!instanceUuid.value) {
      throw new Error('未找到 workspace instance uuid。')
    }
    closeReplayConnection()
    resetReplayState()
    closeLiveConnection()
    resetLiveState()
    openTestRunPanel?.()
    setWorkbenchError(null)
    streamFeedMode.value = 'live'
    runAttachState.value = 'connecting'
    liveConnection.value = await client.workflow.debugNodeStream(instanceUuid.value, nodeId, {
      inputs: payload,
    }, {
      onEvent: handleWorkflowStreamEvent,
      onServerError: (message) => {
        setWorkbenchError(message)
        liveRunStatus.value = 'failed'
        runAttachState.value = 'error'
        void finalizeLiveStream()
      },
      onError: (error) => {
        reportError(
          error instanceof Error ? error.message : '启动节点调试流失败。',
          error,
        )
        liveRunStatus.value = 'failed'
        runAttachState.value = 'error'
        void finalizeLiveStream()
      },
    })
  }

  const restorePersistedRunningRun = async (runs: WorkflowRunSummaryRead[]): Promise<boolean> => {
    const persistedRunId = runSession.readPersistedRunId()
    if (!persistedRunId) {
      return false
    }
    const targetRun = runs.find(run => run.run_id === persistedRunId) ?? null
    if (targetRun?.status === 'running') {
      selectedRunId.value = persistedRunId
      await startLiveRunStream(persistedRunId)
      return true
    }
    runSession.persistRunId(null)
    return false
  }

  const selectRun = async (runId: string, runs: WorkflowRunSummaryRead[]): Promise<void> => {
    selectedRunId.value = runId
    const targetSummary = runs.find(run => run.run_id === runId) ?? null
    if (!targetSummary) {
      return
    }

    if (streamFeedMode.value === 'replay' && replayRunId.value !== runId) {
      closeReplayConnection()
      resetReplayState()
      runAttachState.value = 'idle'
    }

    if (targetSummary.status === 'running') {
      const afterSeq = liveRunId.value === runId ? liveLastSeq.value : 0
      await startLiveRunStream(runId, afterSeq)
      return
    }

    if (streamFeedMode.value === 'live') {
      closeLiveConnection()
      runSession.persistRunId(null)
      runAttachState.value = 'idle'
      streamFeedMode.value = 'history'
    }

    if (liveRunId.value && liveRunId.value !== runId) {
      closeLiveConnection()
    }
  }

  return {
    liveRunEvents,
    replayRunId,
    replayRunEvents,
    streamFeedMode,
    isLiveRunning,
    closeAllStreams,
    resetAllStreams,
    startLiveRunStream,
    startReplayRunStream,
    startWorkflowExecutionStream,
    startWorkflowResumeStream,
    startWorkflowDebugStream,
    restorePersistedRunningRun,
    selectRun,
  }
}
