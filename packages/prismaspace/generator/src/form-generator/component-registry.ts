import type {
  ActionComponentCatalogItem,
  ActionRendererDefinition,
  ActionRendererDescriptor,
  ActionRendererRecord,
  FieldComponentCatalogItem,
  FieldRendererDefinition,
  FieldRendererDescriptor,
  FieldRendererRecord,
  RegisterableActionDescriptors,
  RegisterableActionRenderers,
  RegisterableFieldDescriptors,
  RegisterableFieldRenderers,
} from "./types"
import { builtInActionDescriptors } from "./action-renderers"
import { UnsupportedField, builtInFieldDescriptors } from "./field-renderers"

export { builtInActionDescriptors } from "./action-renderers"
export { builtInFieldDescriptors } from "./field-renderers"

const normalizeKey = (value: string) => value.trim().toLowerCase()

function fieldCatalogItemFromDescriptor(descriptor: FieldRendererDescriptor): FieldComponentCatalogItem {
  const { renderer: _renderer, ...rest } = descriptor
  return rest
}

function actionCatalogItemFromDescriptor(descriptor: ActionRendererDescriptor): ActionComponentCatalogItem {
  const { renderer: _renderer, ...rest } = descriptor
  return rest
}

function descriptorsFromFieldInput(
  input?: RegisterableFieldDescriptors | RegisterableFieldRenderers,
): FieldRendererDescriptor[] {
  if (!input) {
    return []
  }

  if (Array.isArray(input)) {
    return input
  }

  if (input instanceof Map) {
    return [...input.entries()].map(([key, value]) => {
      if ("renderer" in value) {
        return value
      }

      return {
        name: String(key),
        title: String(key),
        description: `Legacy field renderer "${key}" registered without descriptor metadata.`,
        category: "misc",
        kind: "field",
        valueShape: "unknown",
        renderer: value,
      } satisfies FieldRendererDescriptor
    })
  }

  return Object.entries(input).map(([key, value]) => {
    if (value && typeof value === "object" && "renderer" in value) {
      return value
    }

    return {
      name: key,
      title: key,
      description: `Legacy field renderer "${key}" registered without descriptor metadata.`,
      category: "misc",
      kind: "field",
      valueShape: "unknown",
      renderer: value as FieldRendererDefinition,
    } satisfies FieldRendererDescriptor
  })
}

function descriptorsFromActionInput(
  input?: RegisterableActionDescriptors | RegisterableActionRenderers,
): ActionRendererDescriptor[] {
  if (!input) {
    return []
  }

  if (Array.isArray(input)) {
    return input
  }

  if (input instanceof Map) {
    return [...input.entries()].map(([key, value]) => {
      if ("renderer" in value) {
        return value
      }

      return {
        name: String(key),
        title: String(key),
        description: `Legacy action renderer "${key}" registered without descriptor metadata.`,
        category: "action",
        kind: "action",
        renderer: value,
      } satisfies ActionRendererDescriptor
    })
  }

  return Object.entries(input).map(([key, value]) => {
    if (value && typeof value === "object" && "renderer" in value) {
      return value
    }

    return {
      name: key,
      title: key,
      description: `Legacy action renderer "${key}" registered without descriptor metadata.`,
      category: "action",
      kind: "action",
      renderer: value as ActionRendererDefinition,
    } satisfies ActionRendererDescriptor
  })
}

function buildFieldDescriptorRegistry(descriptors: FieldRendererDescriptor[]): Map<string, FieldRendererDescriptor> {
  const registry = new Map<string, FieldRendererDescriptor>()

  for (const input of descriptors) {
    const descriptor = {
      ...input,
      name: normalizeKey(input.name),
    }

    registry.set(descriptor.name, descriptor)
  }

  return registry
}

function buildActionDescriptorRegistry(descriptors: ActionRendererDescriptor[]): Map<string, ActionRendererDescriptor> {
  const registry = new Map<string, ActionRendererDescriptor>()

  for (const input of descriptors) {
    const descriptor = {
      ...input,
      name: normalizeKey(input.name),
    }

    registry.set(descriptor.name, descriptor)
  }

  return registry
}

function mergeDescriptorMaps<T extends { name: string }>(
  base: Map<string, T>,
  additions: Map<string, T>,
): Map<string, T> {
  const merged = new Map(base)

  for (const [key, descriptor] of additions.entries()) {
    merged.set(key, descriptor)
  }

  return merged
}

function rendererMapFromFieldDescriptors(
  registry: Map<string, FieldRendererDescriptor>,
): Map<string, FieldRendererDefinition> {
  return new Map(
    [...registry.entries()].map(([key, descriptor]) => [key, descriptor.renderer] as const),
  )
}

function rendererMapFromActionDescriptors(
  registry: Map<string, ActionRendererDescriptor>,
): Map<string, ActionRendererDefinition> {
  return new Map(
    [...registry.entries()].map(([key, descriptor]) => [key, descriptor.renderer] as const),
  )
}

export const builtInFieldDescriptorRegistry = buildFieldDescriptorRegistry(builtInFieldDescriptors)
export const builtInActionDescriptorRegistry = buildActionDescriptorRegistry(builtInActionDescriptors)

export const builtInFieldRenderers: FieldRendererRecord = Object.fromEntries(
  [...rendererMapFromFieldDescriptors(builtInFieldDescriptorRegistry).entries()],
)

export const builtInActionRenderers: ActionRendererRecord = Object.fromEntries(
  [...rendererMapFromActionDescriptors(builtInActionDescriptorRegistry).entries()],
)

export function createFieldDescriptorRegistry(
  customDescriptors?: RegisterableFieldDescriptors,
  customRenderers?: RegisterableFieldRenderers,
): Map<string, FieldRendererDescriptor> {
  let registry = new Map(builtInFieldDescriptorRegistry)

  const descriptorEntries = descriptorsFromFieldInput(customDescriptors)
  if (descriptorEntries.length > 0) {
    registry = mergeDescriptorMaps(registry, buildFieldDescriptorRegistry(descriptorEntries))
  }

  const legacyEntries = descriptorsFromFieldInput(customRenderers)
  if (legacyEntries.length > 0) {
    registry = mergeDescriptorMaps(registry, buildFieldDescriptorRegistry(legacyEntries))
  }

  return registry
}

export function createActionDescriptorRegistry(
  customDescriptors?: RegisterableActionDescriptors,
  customRenderers?: RegisterableActionRenderers,
): Map<string, ActionRendererDescriptor> {
  let registry = new Map(builtInActionDescriptorRegistry)

  const descriptorEntries = descriptorsFromActionInput(customDescriptors)
  if (descriptorEntries.length > 0) {
    registry = mergeDescriptorMaps(registry, buildActionDescriptorRegistry(descriptorEntries))
  }

  const legacyEntries = descriptorsFromActionInput(customRenderers)
  if (legacyEntries.length > 0) {
    registry = mergeDescriptorMaps(registry, buildActionDescriptorRegistry(legacyEntries))
  }

  return registry
}

export function createFieldRendererRegistry(
  customRenderers?: RegisterableFieldRenderers,
  customDescriptors?: RegisterableFieldDescriptors,
): Map<string, FieldRendererDefinition> {
  return rendererMapFromFieldDescriptors(
    createFieldDescriptorRegistry(customDescriptors, customRenderers),
  )
}

export function createActionRendererRegistry(
  customRenderers?: RegisterableActionRenderers,
  customDescriptors?: RegisterableActionDescriptors,
): Map<string, ActionRendererDefinition> {
  return rendererMapFromActionDescriptors(
    createActionDescriptorRegistry(customDescriptors, customRenderers),
  )
}

export function listFieldDescriptors(
  registry: Map<string, FieldRendererDescriptor>,
): FieldComponentCatalogItem[] {
  return [...registry.values()].map(fieldCatalogItemFromDescriptor)
}

export function listActionDescriptors(
  registry: Map<string, ActionRendererDescriptor>,
): ActionComponentCatalogItem[] {
  return [...registry.values()].map(actionCatalogItemFromDescriptor)
}

export function getFieldDescriptor(
  registry: Map<string, FieldRendererDescriptor>,
  control: string,
): FieldComponentCatalogItem | undefined {
  const descriptor = registry.get(normalizeKey(control || ""))
  return descriptor ? fieldCatalogItemFromDescriptor(descriptor) : undefined
}

export function getActionDescriptor(
  registry: Map<string, ActionRendererDescriptor>,
  actionType: string,
): ActionComponentCatalogItem | undefined {
  const descriptor = registry.get(normalizeKey(actionType || ""))
  return descriptor ? actionCatalogItemFromDescriptor(descriptor) : undefined
}

export function resolveFieldRenderer(
  registry: Map<string, FieldRendererDefinition>,
  control: string,
): FieldRendererDefinition {
  const normalized = normalizeKey(control || "")
  return registry.get(normalized) ?? {
    component: UnsupportedField,
    getProps: () => ({
      fieldProps: {
        control,
      },
    }),
  }
}

export function resolveActionRenderer(
  registry: Map<string, ActionRendererDefinition>,
  actionType: string,
): ActionRendererDefinition {
  const normalized = normalizeKey(actionType || "button")
  return registry.get(normalized) ?? builtInActionDescriptorRegistry.get("button")!.renderer
}
