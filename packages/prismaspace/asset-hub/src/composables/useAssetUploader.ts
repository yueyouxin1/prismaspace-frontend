import { ref } from 'vue'
import type {
  AssetHubAdapter,
  AssetRead,
  AssetUploadError,
  UploadTask,
} from '../types/asset-hub'

interface UploadOptions {
  folderUuid?: string | null
  forceAiProcessing?: boolean
}

interface UseAssetUploaderOptions {
  adapter: AssetHubAdapter
  workspaceUuid: string
  concurrency?: number
}

interface HttpBusinessErrorLike {
  status?: unknown
  code?: unknown
  message?: unknown
  actionText?: unknown
}

const isHttpBusinessErrorLike = (error: unknown): error is HttpBusinessErrorLike => {
  if (!error || typeof error !== 'object') {
    return false
  }
  const maybe = error as HttpBusinessErrorLike
  return typeof maybe.status === 'number' && typeof maybe.code === 'string' && typeof maybe.message === 'string'
}

const toUploadError = (phase: AssetUploadError['phase'], fallbackMessage: string, cause?: unknown): AssetUploadError => {
  if (isHttpBusinessErrorLike(cause)) {
    return {
      phase,
      status: cause.status as number,
      code: cause.code as string,
      message: cause.message as string,
      actionText: typeof cause.actionText === 'string' ? cause.actionText : undefined,
      cause,
    }
  }

  if (cause instanceof DOMException && cause.name === 'AbortError') {
    return {
      phase,
      status: 400,
      code: 'upload_cancelled',
      message: 'Upload cancelled.',
      cause,
    }
  }

  const message = cause instanceof Error ? cause.message : fallbackMessage
  return {
    phase,
    status: 400,
    code: `asset_upload_${phase}_failed`,
    message,
    cause,
  }
}

const wait = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const runWithRetry = async <T>(
  fn: () => Promise<T>,
  retries: number,
  signal?: AbortSignal,
): Promise<T> => {
  let lastError: unknown = null
  for (let index = 0; index <= retries; index += 1) {
    if (signal?.aborted) {
      throw new DOMException('Upload cancelled.', 'AbortError')
    }

    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (signal?.aborted || index === retries) {
        break
      }
      await wait(250 * (index + 1))
    }
  }
  throw lastError
}

const toMimeType = (file: File): string => {
  if (file.type && file.type.trim().length > 0) {
    return file.type
  }
  return 'application/octet-stream'
}

const uploadToProvider = async (
  ticket: { upload_url: string; form_data: Record<string, unknown> },
  file: File,
  signal?: AbortSignal,
): Promise<void> => {
  const formData = new FormData()
  Object.entries(ticket.form_data).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return
    }
    formData.append(key, String(value))
  })
  formData.append('file', file)

  const response = await fetch(ticket.upload_url, {
    method: 'POST',
    body: formData,
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Upload failed with status ${response.status}`)
  }
}

export const useAssetUploader = (options: UseAssetUploaderOptions) => {
  const tasks = ref<UploadTask[]>([])
  const concurrency = Math.max(1, options.concurrency ?? 3)

  const processFile = async (task: UploadTask, uploadOptions: UploadOptions): Promise<AssetRead> => {
    const abortController = new AbortController()
    task.abortController = abortController
    task.status = 'uploading'
    task.progress = 5

    try {
      const ticket = await runWithRetry(
        () => options.adapter.createUploadTicket(options.workspaceUuid, {
          filename: task.file.name,
          size_bytes: task.file.size,
          mime_type: toMimeType(task.file),
          folder_uuid: uploadOptions.folderUuid ?? null,
        }),
        2,
        abortController.signal,
      )
      task.progress = 25

      await runWithRetry(
        () => uploadToProvider(ticket, task.file, abortController.signal),
        2,
        abortController.signal,
      )
      task.progress = 75

      task.status = 'confirming'
      const result = await runWithRetry(
        () => options.adapter.confirmUpload({
          workspace_uuid: options.workspaceUuid,
          asset_uuid: ticket.asset_uuid,
          upload_key: ticket.upload_key,
          folder_uuid: uploadOptions.folderUuid ?? null,
          name: task.file.name,
          force_ai_processing: uploadOptions.forceAiProcessing,
        }),
        2,
        abortController.signal,
      )

      task.status = 'success'
      task.result = result
      task.progress = 100
      return result
    } catch (error) {
      if (abortController.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        task.status = 'cancelled'
        task.error = toUploadError('uploading', 'Upload cancelled.', error)
        throw task.error
      }

      const phase: AssetUploadError['phase'] = task.status === 'confirming'
        ? 'confirm'
        : task.progress <= 25
          ? 'ticket'
          : 'uploading'
      task.status = 'failed'
      task.error = toUploadError(phase, 'Upload failed.', error)
      throw task.error
    } finally {
      task.abortController = undefined
    }
  }

  const uploadFiles = async (
    incomingFiles: File[] | FileList,
    uploadOptions: UploadOptions = {},
  ): Promise<AssetRead[]> => {
    const fileList = Array.from(incomingFiles)
    if (!fileList.length) {
      return []
    }

    const createdTasks: UploadTask[] = fileList.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      status: 'queued',
      progress: 0,
    }))
    tasks.value = [...createdTasks, ...tasks.value]

    const results: AssetRead[] = []
    let cursor = 0

    const worker = async (): Promise<void> => {
      while (cursor < createdTasks.length) {
        const index = cursor
        cursor += 1

        const task = createdTasks[index]
        if (!task) {
          return
        }

        try {
          const result = await processFile(task, uploadOptions)
          results.push(result)
        } catch {
          // Per-task errors are carried by task.error for UI inspection.
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, createdTasks.length) }, () => worker())
    await Promise.all(workers)

    return results
  }

  const cancelTask = (taskId: string): void => {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task?.abortController) {
      return
    }
    task.abortController.abort()
  }

  const clearFinished = (): void => {
    tasks.value = tasks.value.filter(task => (
      task.status === 'queued' || task.status === 'uploading' || task.status === 'confirming'
    ))
  }

  return {
    tasks,
    uploadFiles,
    cancelTask,
    clearFinished,
  }
}
