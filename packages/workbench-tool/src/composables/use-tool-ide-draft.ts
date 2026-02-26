import { computed, ref } from 'vue'
import {
  exportParameterSchema,
  importParameterSchema,
  useParamSchemaEditor,
  validateTree,
} from '@repo/editor'
import {
  extractToolRunFields,
  normalizeParameterSchemaList,
  normalizeToolMethod,
  normalizeToolUrl,
} from '../adapters/tool-schema-adapter'
import type {
  ToolHttpMethod,
  ToolIdeSavePayload,
  ToolIdeSeed,
  ToolInstanceDraft,
  ToolRunField,
} from '../types/tool-ide'

const serializeSnapshot = (payload: {
  name: string
  description: string
  url: string
  method: ToolHttpMethod
  inputsSchema: ReturnType<typeof normalizeParameterSchemaList>
  outputsSchema: ReturnType<typeof normalizeParameterSchemaList>
}): string => {
  return JSON.stringify(payload)
}

export const useToolIdeDraft = () => {
  const name = ref('')
  const description = ref('')
  const url = ref('')
  const method = ref<ToolHttpMethod>('GET')

  const inputEditor = useParamSchemaEditor()
  const outputEditor = useParamSchemaEditor()

  const baselineSnapshot = ref('')
  const initialized = ref(false)

  const inputsSchema = computed(() => {
    return normalizeParameterSchemaList(exportParameterSchema(inputEditor.state.value.tree))
  })

  const outputsSchema = computed(() => {
    return normalizeParameterSchemaList(exportParameterSchema(outputEditor.state.value.tree))
  })

  const currentResource = computed(() => ({
    name: name.value.trim(),
    description: description.value.trim(),
  }))

  const currentInstance = computed<ToolInstanceDraft>(() => ({
    url: normalizeToolUrl(url.value),
    method: normalizeToolMethod(method.value),
    inputsSchema: inputsSchema.value,
    outputsSchema: outputsSchema.value,
  }))

  const currentSnapshot = computed(() =>
    serializeSnapshot({
      name: currentResource.value.name,
      description: currentResource.value.description,
      url: currentInstance.value.url,
      method: currentInstance.value.method,
      inputsSchema: currentInstance.value.inputsSchema,
      outputsSchema: currentInstance.value.outputsSchema,
    }),
  )

  const isDirty = computed(() => {
    if (!initialized.value) {
      return false
    }
    return currentSnapshot.value !== baselineSnapshot.value
  })

  const inputValidation = computed(() => validateTree(inputEditor.state.value.tree))
  const outputValidation = computed(() => validateTree(outputEditor.state.value.tree))

  const schemaErrors = computed(() => {
    return [...inputValidation.value.errors, ...outputValidation.value.errors]
  })

  const runFields = computed<ToolRunField[]>(() => {
    return extractToolRunFields(inputsSchema.value)
  })

  const applySeed = (seed: ToolIdeSeed): void => {
    const normalizedName = seed.resource.name.trim()
    const normalizedDescription = seed.resource.description.trim()
    const normalizedUrl = normalizeToolUrl(seed.instance.url)
    const normalizedMethod = normalizeToolMethod(seed.instance.method)
    const normalizedInputs = normalizeParameterSchemaList(seed.instance.inputsSchema)
    const normalizedOutputs = normalizeParameterSchemaList(seed.instance.outputsSchema)

    name.value = normalizedName
    description.value = normalizedDescription
    url.value = normalizedUrl
    method.value = normalizedMethod

    inputEditor.dispatch({
      type: 'reset',
      tree: importParameterSchema(normalizedInputs),
    })
    outputEditor.dispatch({
      type: 'reset',
      tree: importParameterSchema(normalizedOutputs),
    })

    baselineSnapshot.value = serializeSnapshot({
      name: normalizedName,
      description: normalizedDescription,
      url: normalizedUrl,
      method: normalizedMethod,
      inputsSchema: normalizedInputs,
      outputsSchema: normalizedOutputs,
    })
    initialized.value = true
  }

  const buildSavePayload = (): ToolIdeSavePayload => {
    const normalizedResource = currentResource.value
    const normalizedInstance = currentInstance.value
    const snapshotObject = JSON.parse(currentSnapshot.value) as {
      name: string
      description: string
      url: string
      method: ToolHttpMethod
      inputsSchema: ReturnType<typeof normalizeParameterSchemaList>
      outputsSchema: ReturnType<typeof normalizeParameterSchemaList>
    }
    const baselineObject = baselineSnapshot.value
      ? (JSON.parse(baselineSnapshot.value) as typeof snapshotObject)
      : null

    const hasResourceChanges = !baselineObject
      || normalizedResource.name !== baselineObject.name
      || normalizedResource.description !== baselineObject.description
    const hasInstanceChanges = !baselineObject
      || normalizedInstance.url !== baselineObject.url
      || normalizedInstance.method !== baselineObject.method
      || JSON.stringify(snapshotObject.inputsSchema) !== JSON.stringify(baselineObject.inputsSchema)
      || JSON.stringify(snapshotObject.outputsSchema) !== JSON.stringify(baselineObject.outputsSchema)

    return {
      resource: normalizedResource,
      instance: normalizedInstance,
      hasResourceChanges,
      hasInstanceChanges,
    }
  }

  const markSaved = (): void => {
    baselineSnapshot.value = currentSnapshot.value
    initialized.value = true
  }

  return {
    name,
    description,
    url,
    method,
    inputEditor,
    outputEditor,
    inputsSchema,
    outputsSchema,
    inputValidation,
    outputValidation,
    schemaErrors,
    runFields,
    isDirty,
    applySeed,
    buildSavePayload,
    markSaved,
  }
}
