<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { prismaspaceQueryKeys } from '@prismaspace/resources-core'
import type {
  AnyInstanceRead,
  WorkflowGraphRead,
  WorkflowNodeDefRead,
  WorkflowNodeRead,
} from '@prismaspace/contracts'
import type { PrismaspaceClient } from '@prismaspace/sdk'
import { Alert, AlertDescription, AlertTitle } from '@prismaspace/ui-shadcn/components/ui/alert'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@prismaspace/ui-shadcn/components/ui/card'
import { Skeleton } from '@prismaspace/ui-shadcn/components/ui/skeleton'
import WorkflowAddNodeDialog from './components/WorkflowAddNodeDialog.vue'
import WorkflowBottomToolbar from './components/WorkflowBottomToolbar.vue'
import WorkflowCanvas from './components/WorkflowCanvas.vue'
import type { WorkflowCanvasExposed } from './components/WorkflowCanvas.vue'
import WorkflowHeaderBar from './components/WorkflowHeaderBar.vue'
import WorkflowNodeSidePanel from './components/WorkflowNodeSidePanel.vue'
import WorkflowProblemPanel from './components/WorkflowProblemPanel.vue'
import WorkflowTestRunPanel from './components/WorkflowTestRunPanel.vue'
import type { WorkflowLatestExecution, WorkflowValidationResult } from './types/workflow-ide'
import {
  buildWorkflowModelOptions,
  buildWorkflowPaletteGroups,
  buildWorkflowResourceOptionsByType,
  cloneJson,
  createWorkflowNodeFromDefinition,
  ensureWorkflowGraph,
  getNodeDefinitionForNode,
  isProtectedWorkflowNode,
  parseJsonObject,
} from './utils/workflow-helpers'

const props = defineProps<{
  client: PrismaspaceClient
  workspaceUuid: string
  resourceUuid: string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
  onBack?: () => void
  onError?: (error: unknown) => void
}>()

const queryClient = useQueryClient()

const runInputText = ref('{\n  "input": "你好"\n}')
const debugInputText = ref('{\n}')
const draftGraph = ref<WorkflowGraphRead>(ensureWorkflowGraph())
const baselineGraphSnapshot = ref('')
const canvasRef = ref<WorkflowCanvasExposed | null>(null)
const selectedNodeId = ref<string | null>(null)
const selectedRunId = ref<string | null>(null)
const validationResult = ref<WorkflowValidationResult | null>(null)
const latestExecution = ref<WorkflowLatestExecution | null>(null)
const workbenchError = ref<string | null>(null)
const lastSavedAt = ref<string | null>(null)
const hasAppliedSeed = ref(false)
const addNodeDialogOpen = ref(false)
const testRunPanelOpen = ref(false)
const problemsPanelOpen = ref(false)

const resourceUuid = computed(() => props.resourceUuid)
const workspaceUuid = computed(() => props.workspaceUuid)
const instanceUuid = computed(() => props.workspaceInstanceUuid ?? null)

const resourceDetailQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.resourceDetail(resourceUuid.value)),
  enabled: computed(() => Boolean(resourceUuid.value)),
  queryFn: async () => props.client.resource.getResource(resourceUuid.value),
})

const workflowInstanceQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.workflowInstance(instanceUuid.value)),
  enabled: computed(() => Boolean(instanceUuid.value)),
  queryFn: async () => props.client.workflow.getWorkflowInstance(instanceUuid.value as string),
})

const nodeDefsQuery = useQuery({
  queryKey: prismaspaceQueryKeys.workflowNodeDefs,
  queryFn: async () => props.client.workflow.listNodeDefinitions(),
})

const workspaceResourcesQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.workspaceResources(workspaceUuid.value)),
  enabled: computed(() => Boolean(workspaceUuid.value)),
  queryFn: async () => props.client.resource.listWorkspaceResources(workspaceUuid.value),
})

const modelOptionsQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.serviceModulesAvailable(workspaceUuid.value, 'llm')),
  enabled: computed(() => Boolean(workspaceUuid.value)),
  queryFn: async () => props.client.serviceModule.listAvailableModules(workspaceUuid.value, 'llm'),
})

const runsQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.workflowRuns(instanceUuid.value, 30)),
  enabled: computed(() => Boolean(instanceUuid.value)),
  refetchInterval: 2500,
  queryFn: async () => props.client.workflow.listRuns(instanceUuid.value as string, 30),
})

const selectedRunQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.workflowRun(selectedRunId.value)),
  enabled: computed(() => Boolean(selectedRunId.value)),
  refetchInterval: 1500,
  queryFn: async () => props.client.workflow.getRun(selectedRunId.value as string),
})

const selectedRunEventsQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.workflowRunEvents(selectedRunId.value, 200)),
  enabled: computed(() => Boolean(selectedRunId.value)),
  refetchInterval: 1500,
  queryFn: async () => props.client.workflow.listRunEvents(selectedRunId.value as string, 200),
})

const selectedNode = computed(() => draftGraph.value.nodes.find(node => node.id === selectedNodeId.value) ?? null)
const selectedNodeDefinition = computed(() => getNodeDefinitionForNode(nodeDefsQuery.data.value ?? [], selectedNode.value) ?? null)
const paletteGroups = computed(() => buildWorkflowPaletteGroups(nodeDefsQuery.data.value ?? []))
const resourceOptionsByType = computed(() => buildWorkflowResourceOptionsByType(workspaceResourcesQuery.data.value ?? []))
const modelOptions = computed(() => buildWorkflowModelOptions(modelOptionsQuery.data.value ?? []))
const isDirty = computed(() => JSON.stringify(draftGraph.value) !== baselineGraphSnapshot.value)
const latestRunSummary = computed(() => runsQuery.data.value?.[0] ?? null)
const currentZoomLabel = computed(() => {
  const zoom = typeof draftGraph.value.viewport?.zoom === 'number' ? draftGraph.value.viewport.zoom : 1
  return `${Math.round(zoom * 100)}%`
})
const activePanelWidth = computed(() => (testRunPanelOpen.value ? 372 : selectedNode.value ? 392 : 0))
const bottomPanelHeight = computed(() => (problemsPanelOpen.value ? 230 : 0))
const floatingRightInset = computed(() => activePanelWidth.value ? activePanelWidth.value + 32 : 16)

const latestRunStatusLabel = computed(() => {
  const run = latestRunSummary.value
  if (!run) {
    return null
  }
  const statusMap: Record<string, string> = {
    RUNNING: '运行中',
    COMPLETED: '运行完成',
    FAILED: '运行失败',
    CANCELLED: '运行取消',
    INTERRUPTED: '等待恢复',
  }
  return statusMap[run.status] ?? run.status
})

const syncDraftFromInstance = (instanceGraph?: WorkflowGraphRead | null): void => {
  draftGraph.value = ensureWorkflowGraph(instanceGraph)
  baselineGraphSnapshot.value = JSON.stringify(draftGraph.value)
  selectedNodeId.value = null
  hasAppliedSeed.value = true
}

const handleViewportUpdate = (viewport: { x: number; y: number; zoom: number }): void => {
  draftGraph.value = {
    ...draftGraph.value,
    viewport: {
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom,
    },
  }
}

watch(
  () => workflowInstanceQuery.data.value,
  (instance) => {
    if (!instance) {
      return
    }
    if (!hasAppliedSeed.value || !isDirty.value) {
      syncDraftFromInstance(instance.graph)
    }
  },
  { immediate: true },
)

watch(
  () => runsQuery.data.value,
  (runs) => {
    if (!runs?.length) {
      selectedRunId.value = null
      return
    }
    if (!selectedRunId.value || !runs.some(run => run.run_id === selectedRunId.value)) {
      selectedRunId.value = runs[0]?.run_id ?? null
    }
  },
  { immediate: true },
)

watch(
  () => selectedNodeId.value,
  (nodeId) => {
    if (!nodeId) {
      return
    }
    void nodeDefsQuery.refetch()
  },
)

watch(
  () => validationResult.value?.errors?.length,
  (count) => {
    if (count && count > 0) {
      problemsPanelOpen.value = true
    }
  },
)

const invalidateWorkflowQueries = async (): Promise<void> => {
  const invalidations: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: prismaspaceQueryKeys.resourceDetail(resourceUuid.value) }),
    queryClient.invalidateQueries({ queryKey: prismaspaceQueryKeys.resourceInstances(resourceUuid.value) }),
    queryClient.invalidateQueries({ queryKey: prismaspaceQueryKeys.workflowInstance(instanceUuid.value) }),
    queryClient.invalidateQueries({ queryKey: prismaspaceQueryKeys.workflowRuns(instanceUuid.value, 30) }),
    queryClient.invalidateQueries({ queryKey: prismaspaceQueryKeys.workflowNodeDefs }),
  ]
  if (workspaceUuid.value) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: prismaspaceQueryKeys.workspaceResources(workspaceUuid.value) }))
  }
  if (selectedRunId.value) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: prismaspaceQueryKeys.workflowRun(selectedRunId.value) }))
    invalidations.push(queryClient.invalidateQueries({ queryKey: prismaspaceQueryKeys.workflowRunEvents(selectedRunId.value, 200) }))
  }
  await Promise.all(invalidations)
}

const saveMutation = useMutation({
  mutationFn: async () => {
    if (!instanceUuid.value) {
      throw new Error('未找到 workspace instance uuid。')
    }
    return props.client.workflow.updateWorkflowInstance(instanceUuid.value, {
      graph: draftGraph.value,
    })
  },
  onSuccess: async (instance) => {
    syncDraftFromInstance(instance.graph)
    lastSavedAt.value = new Date().toISOString()
    workbenchError.value = null
    await invalidateWorkflowQueries()
  },
  onError: (error) => {
    workbenchError.value = error instanceof Error ? error.message : '保存工作流失败。'
    props.onError?.(error)
  },
})

const validateMutation = useMutation({
  mutationFn: async () => {
    if (!instanceUuid.value) {
      throw new Error('未找到 workspace instance uuid。')
    }
    return props.client.workflow.validate(instanceUuid.value)
  },
  onSuccess: (result) => {
    validationResult.value = result
    workbenchError.value = null
  },
  onError: (error) => {
    workbenchError.value = error instanceof Error ? error.message : '校验失败。'
    props.onError?.(error)
  },
})

const executeMutation = useMutation({
  mutationFn: async () => {
    if (!instanceUuid.value) {
      throw new Error('未找到 workspace instance uuid。')
    }
    const payload = parseJsonObject(runInputText.value)
    return props.client.workflow.execute(instanceUuid.value, {
      inputs: payload,
    })
  },
  onSuccess: async (response) => {
    latestExecution.value = {
      mode: 'run',
      response,
      finishedAt: new Date().toISOString(),
    }
    if (response.data.run_id) {
      selectedRunId.value = response.data.run_id
    }
    workbenchError.value = null
    testRunPanelOpen.value = true
    await invalidateWorkflowQueries()
  },
  onError: (error) => {
    workbenchError.value = error instanceof Error ? error.message : '执行工作流失败。'
    props.onError?.(error)
  },
})

const executeAsyncMutation = useMutation({
  mutationFn: async () => {
    if (!instanceUuid.value) {
      throw new Error('未找到 workspace instance uuid。')
    }
    const payload = parseJsonObject(runInputText.value)
    return props.client.workflow.executeAsync(instanceUuid.value, {
      inputs: payload,
    })
  },
  onSuccess: async (summary) => {
    selectedRunId.value = summary.run_id
    latestExecution.value = null
    workbenchError.value = null
    testRunPanelOpen.value = true
    await invalidateWorkflowQueries()
  },
  onError: (error) => {
    workbenchError.value = error instanceof Error ? error.message : '后台运行失败。'
    props.onError?.(error)
  },
})

const debugMutation = useMutation({
  mutationFn: async () => {
    if (!instanceUuid.value || !selectedNode.value) {
      throw new Error('请选择需要调试的节点。')
    }
    const payload = parseJsonObject(debugInputText.value)
    return props.client.workflow.debugNode(instanceUuid.value, selectedNode.value.id, {
      inputs: payload,
    })
  },
  onSuccess: async (response) => {
    latestExecution.value = {
      mode: 'debug',
      nodeId: selectedNode.value?.id ?? null,
      response,
      finishedAt: new Date().toISOString(),
    }
    if (response.data.run_id) {
      selectedRunId.value = response.data.run_id
    }
    workbenchError.value = null
    testRunPanelOpen.value = true
    await invalidateWorkflowQueries()
  },
  onError: (error) => {
    workbenchError.value = error instanceof Error ? error.message : '调试节点失败。'
    props.onError?.(error)
  },
})

const publishMutation = useMutation({
  mutationFn: async () => {
    if (!instanceUuid.value) {
      throw new Error('未找到 workspace instance uuid。')
    }
    const now = new Date()
    const pad = (value: number, length = 2): string => String(value).padStart(length, '0')
    const versionTag = `v${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`
    return props.client.resource.publishInstance(instanceUuid.value, {
      version_tag: versionTag,
    })
  },
  onSuccess: async () => {
    workbenchError.value = null
    await invalidateWorkflowQueries()
  },
  onError: (error) => {
    workbenchError.value = error instanceof Error ? error.message : '发布工作流失败。'
    props.onError?.(error)
  },
})

const cancelRunMutation = useMutation({
  mutationFn: async (runId: string) => props.client.workflow.cancelRun(runId),
  onSuccess: async () => {
    await invalidateWorkflowQueries()
  },
  onError: (error) => {
    workbenchError.value = error instanceof Error ? error.message : '取消运行失败。'
    props.onError?.(error)
  },
})

const saveIfDirty = async (): Promise<void> => {
  if (!isDirty.value) {
    return
  }
  await saveMutation.mutateAsync()
}

const handleRun = async (): Promise<void> => {
  try {
    await saveIfDirty()
  } catch {
    return
  }
  await executeMutation.mutateAsync()
}

const handleRunAsync = async (): Promise<void> => {
  try {
    await saveIfDirty()
  } catch {
    return
  }
  await executeAsyncMutation.mutateAsync()
}

const handleValidate = async (): Promise<void> => {
  try {
    await saveIfDirty()
  } catch {
    return
  }
  await validateMutation.mutateAsync()
}

const handleDebugSelectedNode = async (): Promise<void> => {
  try {
    await saveIfDirty()
  } catch {
    return
  }
  await debugMutation.mutateAsync()
}

const handlePublish = async (): Promise<void> => {
  try {
    await saveIfDirty()
  } catch {
    return
  }
  await publishMutation.mutateAsync()
}

const handleAddNodeAt = (definition: WorkflowNodeDefRead, position?: { x: number; y: number }): void => {
  const registryId = definition.node.registryId
  if ((registryId === 'Start' || registryId === 'End')
    && draftGraph.value.nodes.some(node => node.data.registryId === registryId)) {
    workbenchError.value = `${registryId} 节点只能存在一个。`
    return
  }
  const nextNode = createWorkflowNodeFromDefinition(definition, draftGraph.value.nodes.length, position)
  draftGraph.value = {
    ...draftGraph.value,
    nodes: [...draftGraph.value.nodes, nextNode],
  }
  selectedNodeId.value = nextNode.id
  testRunPanelOpen.value = false
}

const handleDropNodeTemplate = (payload: { definitionKey: string; x: number; y: number }): void => {
  const definition = (nodeDefsQuery.data.value ?? []).find(item => item.node_uid === payload.definitionKey || item.node.registryId === payload.definitionKey)
  if (!definition) {
    return
  }
  handleAddNodeAt(definition, { x: payload.x, y: payload.y })
}

const handleConnect = (payload: {
  sourceNodeID: string
  targetNodeID: string
  sourcePortID: string
  targetPortID: string
}): void => {
  const exists = draftGraph.value.edges.some(edge =>
    edge.sourceNodeID === payload.sourceNodeID
    && edge.targetNodeID === payload.targetNodeID
    && edge.sourcePortID === payload.sourcePortID
    && edge.targetPortID === payload.targetPortID,
  )
  if (exists) {
    return
  }
  draftGraph.value = {
    ...draftGraph.value,
    edges: [...draftGraph.value.edges, payload],
  }
}

const handleRemoveNodes = (nodeIds: string[]): void => {
  const blockedIds = new Set(
    draftGraph.value.nodes
      .filter(node => isProtectedWorkflowNode(node))
      .map(node => node.id),
  )
  const removableIds = nodeIds.filter(nodeId => !blockedIds.has(nodeId))
  if (!removableIds.length) {
    return
  }
  draftGraph.value = {
    ...draftGraph.value,
    nodes: draftGraph.value.nodes.filter(node => !removableIds.includes(node.id)),
    edges: draftGraph.value.edges.filter(edge =>
      !removableIds.includes(edge.sourceNodeID) && !removableIds.includes(edge.targetNodeID),
    ),
  }
  if (selectedNodeId.value && removableIds.includes(selectedNodeId.value)) {
    selectedNodeId.value = draftGraph.value.nodes.find(node => !isProtectedWorkflowNode(node))?.id
      ?? draftGraph.value.nodes[0]?.id
      ?? null
  }
}

const handleRemoveEdges = (edgeIds: string[]): void => {
  const ids = new Set(edgeIds)
  draftGraph.value = {
    ...draftGraph.value,
    edges: draftGraph.value.edges.filter(edge => !ids.has(`${edge.sourceNodeID}:${edge.sourcePortID}->${edge.targetNodeID}:${edge.targetPortID}`)),
  }
}

const handleUpdateNodePosition = (payload: { id: string; x: number; y: number }): void => {
  draftGraph.value = {
    ...draftGraph.value,
    nodes: draftGraph.value.nodes.map(node =>
      node.id === payload.id
        ? {
            ...node,
            position: {
              x: payload.x,
              y: payload.y,
            },
          }
        : node,
    ),
  }
}

const handleAutoLayout = (): void => {
  const nodes = draftGraph.value.nodes
  const edges = draftGraph.value.edges
  if (!nodes.length) {
    return
  }

  const indegree = new Map<string, number>()
  const outgoing = new Map<string, string[]>()
  const nodeOrder = new Map<string, number>()

  nodes.forEach((node, index) => {
    indegree.set(node.id, 0)
    outgoing.set(node.id, [])
    nodeOrder.set(node.id, index)
  })

  edges.forEach((edge) => {
    outgoing.get(edge.sourceNodeID)?.push(edge.targetNodeID)
    indegree.set(edge.targetNodeID, (indegree.get(edge.targetNodeID) ?? 0) + 1)
  })

  const queue = nodes
    .filter(node => (indegree.get(node.id) ?? 0) === 0)
    .sort((left, right) => (nodeOrder.get(left.id) ?? 0) - (nodeOrder.get(right.id) ?? 0))
    .map(node => node.id)

  const levelMap = new Map<string, number>()
  queue.forEach((id) => levelMap.set(id, 0))

  while (queue.length) {
    const currentId = queue.shift()
    if (!currentId) {
      continue
    }
    const currentLevel = levelMap.get(currentId) ?? 0
    for (const targetId of outgoing.get(currentId) ?? []) {
      levelMap.set(targetId, Math.max(levelMap.get(targetId) ?? 0, currentLevel + 1))
      indegree.set(targetId, (indegree.get(targetId) ?? 0) - 1)
      if ((indegree.get(targetId) ?? 0) <= 0) {
        queue.push(targetId)
      }
    }
  }

  nodes.forEach((node, index) => {
    if (!levelMap.has(node.id)) {
      levelMap.set(node.id, index)
    }
  })

  const laneMap = new Map<number, WorkflowNodeRead[]>()
  nodes.forEach((node) => {
    const lane = levelMap.get(node.id) ?? 0
    const laneNodes = laneMap.get(lane) ?? []
    laneNodes.push(node)
    laneMap.set(lane, laneNodes)
  })

  const H_GAP = 420
  const V_GAP = 220
  const BASE_X = 180
  const BASE_Y = 180

  draftGraph.value = {
    ...draftGraph.value,
    nodes: draftGraph.value.nodes.map((node) => {
      const lane = levelMap.get(node.id) ?? 0
      const laneNodes = laneMap.get(lane) ?? []
      const row = laneNodes.findIndex(item => item.id === node.id)
      return {
        ...node,
        position: {
          x: BASE_X + lane * H_GAP,
          y: BASE_Y + row * V_GAP,
        },
      }
    }),
  }
}

const applyInstanceContractsToNode = async (nodeId: string, nextNodeData: WorkflowNodeRead['data']): Promise<void> => {
  const targetInstanceUuid = String(nextNodeData.config?.resource_instance_uuid ?? '').trim()
  if (!targetInstanceUuid) {
    return
  }
  if (!['ToolNode', 'WorkflowNode'].includes(nextNodeData.registryId)) {
    return
  }

  try {
    const instance = await props.client.resource.getInstance(targetInstanceUuid) as AnyInstanceRead
    draftGraph.value = {
      ...draftGraph.value,
      nodes: draftGraph.value.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node
        }
        return {
          ...node,
          data: {
            ...node.data,
            name: typeof instance.name === 'string' && instance.name ? instance.name : node.data.name,
            description: typeof instance.description === 'string' ? instance.description : node.data.description,
            inputs: Array.isArray(instance.inputs_schema) ? cloneJson(instance.inputs_schema) : node.data.inputs,
            outputs: Array.isArray(instance.outputs_schema) ? cloneJson(instance.outputs_schema) : node.data.outputs,
          },
        }
      }),
    }
  } catch (error) {
    props.onError?.(error)
  }
}

const handleUpdateSelectedNodeData = (value: WorkflowNodeRead['data']): void => {
  if (!selectedNode.value) {
    return
  }
  const previous = cloneJson(selectedNode.value.data)
  draftGraph.value = {
    ...draftGraph.value,
    nodes: draftGraph.value.nodes.map(node =>
      node.id === selectedNode.value?.id
        ? {
            ...node,
            data: cloneJson(value),
          }
        : node,
    ),
  }

  const previousResourceInstance = String(previous.config?.resource_instance_uuid ?? '')
  const nextResourceInstance = String(value.config?.resource_instance_uuid ?? '')
  if (previousResourceInstance !== nextResourceInstance) {
    void applyInstanceContractsToNode(selectedNode.value.id, value)
  }
}

const onBeforeUnload = (event: BeforeUnloadEvent): void => {
  if (!isDirty.value) {
    return
  }
  event.preventDefault()
  event.returnValue = ''
}

watch(
  isDirty,
  (dirty) => {
    if (dirty) {
      window.addEventListener('beforeunload', onBeforeUnload)
      return
    }
    window.removeEventListener('beforeunload', onBeforeUnload)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
})

const isLoading = computed(() =>
  resourceDetailQuery.isLoading.value || workflowInstanceQuery.isLoading.value || nodeDefsQuery.isLoading.value,
)
const isLoadFailed = computed(() =>
  resourceDetailQuery.isError.value || workflowInstanceQuery.isError.value || nodeDefsQuery.isError.value,
)
</script>

<template>
  <div class="h-full min-h-0 bg-[#f7f7fb] text-[#1f2335]">
    <Card v-if="!instanceUuid">
      <CardHeader>
        <CardTitle>Workflow 实例不可用</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3 text-sm text-muted-foreground">
        <p>当前资源缺少 `workspace_instance_uuid`，无法进入 Workflow IDE。</p>
        <Button variant="outline" @click="resourceDetailQuery.refetch()">刷新资源</Button>
      </CardContent>
    </Card>

    <div v-else-if="isLoading" class="space-y-3">
      <Skeleton class="h-24 w-full" />
      <Skeleton class="h-[65vh] w-full" />
    </div>

    <Card v-else-if="isLoadFailed">
      <CardHeader>
        <CardTitle>Workflow IDE 加载失败</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3 text-sm text-muted-foreground">
        <p>无法读取资源详情、工作流实例或节点定义，请重试。</p>
        <Button variant="outline" @click="invalidateWorkflowQueries">重试</Button>
      </CardContent>
    </Card>

    <div v-else class="flex h-full min-h-0 flex-col">
      <WorkflowHeaderBar
        :title="resourceDetailQuery.data.value?.name || 'Workflow'"
        :last-saved-at="lastSavedAt"
        :latest-run-status="latestRunStatusLabel"
        :dirty="isDirty"
        :validating="validateMutation.isPending.value"
        :publishing="publishMutation.isPending.value"
        @back="props.onBack?.()"
        @validate="handleValidate"
        @publish="handlePublish"
      />

      <Alert v-if="workbenchError" variant="destructive" class="mx-5 mt-4 rounded-2xl border-[#ffd7d1] bg-[#fff7f6]">
        <AlertTitle>Workflow 操作失败</AlertTitle>
        <AlertDescription>{{ workbenchError }}</AlertDescription>
      </Alert>

      <div class="relative min-h-0 flex-1 overflow-hidden">
        <div class="relative h-full min-h-0">
          <WorkflowCanvas
            ref="canvasRef"
            :graph="draftGraph"
            :selected-node-id="selectedNodeId"
            @select-node="selectedNodeId = $event; testRunPanelOpen = false"
            @clear-selection="selectedNodeId = null"
            @connect="handleConnect"
            @drop-node-template="handleDropNodeTemplate"
            @update-node-position="handleUpdateNodePosition"
            @update-viewport="handleViewportUpdate"
            @remove-nodes="handleRemoveNodes"
            @remove-edges="handleRemoveEdges"
          />
        </div>

        <div class="pointer-events-none absolute inset-0 z-30">
          <div class="pointer-events-auto">
            <WorkflowNodeSidePanel
              v-if="selectedNode && !testRunPanelOpen"
              :selected-node="selectedNode"
              :selected-node-definition="selectedNodeDefinition"
              :graph="draftGraph"
              :form-context="{ resourceOptionsByType, modelOptions }"
              @update-node-data="handleUpdateSelectedNodeData"
              @close="selectedNodeId = null"
            />
          </div>

          <div class="pointer-events-auto">
            <WorkflowTestRunPanel
              :open="testRunPanelOpen"
              :running="executeMutation.isPending.value || executeAsyncMutation.isPending.value"
              :debugging="debugMutation.isPending.value"
              :can-debug="Boolean(selectedNode)"
              :selected-node-name="selectedNode?.data.name ?? null"
              :input-text="runInputText"
              :workflow-input-schemas="workflowInstanceQuery.data.value?.inputs_schema ?? []"
              :selected-run-id="selectedRunId"
              :runs="runsQuery.data.value ?? []"
              :selected-run="selectedRunQuery.data.value ?? null"
              :selected-run-events="selectedRunEventsQuery.data.value ?? []"
              :loading-run-detail="selectedRunQuery.isLoading.value"
              :loading-run-events="selectedRunEventsQuery.isLoading.value"
              @update:open="testRunPanelOpen = $event"
              @update:input-text="runInputText = $event"
              @run="handleRun"
              @run-async="handleRunAsync"
              @debug-node="handleDebugSelectedNode"
              @select-run="selectedRunId = $event"
              @cancel-run="cancelRunMutation.mutate($event)"
            />
          </div>

          <div class="pointer-events-auto">
        <WorkflowBottomToolbar
          :zoom-label="currentZoomLabel"
          :running="executeMutation.isPending.value || executeAsyncMutation.isPending.value"
          :right-inset="activePanelWidth"
          :bottom-offset="problemsPanelOpen ? bottomPanelHeight + 8 : 0"
          @auto-layout="handleAutoLayout"
          @open-add-node="addNodeDialogOpen = true"
          @open-test-run="testRunPanelOpen = true"
              @open-history="testRunPanelOpen = true"
              @toggle-problems="problemsPanelOpen = !problemsPanelOpen"
              @zoom-in="canvasRef?.zoomIn?.()"
              @zoom-out="canvasRef?.zoomOut?.()"
              @fit-view="canvasRef?.fitView?.()"
              @set-zoom="canvasRef?.zoomTo?.($event)"
            />
          </div>

          <div class="pointer-events-auto">
            <WorkflowProblemPanel
              :open="problemsPanelOpen"
              :right-inset="floatingRightInset"
              :validation-result="validationResult"
              @update:open="problemsPanelOpen = $event"
            />
          </div>
        </div>
      </div>

      <WorkflowAddNodeDialog
        v-model:open="addNodeDialogOpen"
        :groups="paletteGroups"
        @select="handleAddNodeAt"
      />
    </div>
  </div>
</template>
