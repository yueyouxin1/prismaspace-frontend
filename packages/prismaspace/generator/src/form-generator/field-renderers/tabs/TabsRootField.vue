<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, provide, ref } from "vue"
import { cn } from "@prismaspace/ui-shadcn/lib/utils"
import { Tabs, TabsList } from "@prismaspace/ui-shadcn/components/ui/tabs"
import { formGeneratorTabsTriggerPortalKey } from "../../injection-keys"

const props = withDefaults(defineProps<{
  modelValue?: string
  defaultValue?: string
  class?: HTMLAttributes["class"]
  listClass?: HTMLAttributes["class"]
}>(), {
  modelValue: undefined,
  defaultValue: undefined,
  class: "",
  listClass: "",
})

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void
}>()

const internalValue = ref<string | undefined>(props.defaultValue)
const triggerTarget = ref<HTMLElement | null>(null)

provide(formGeneratorTabsTriggerPortalKey, {
  target: triggerTarget,
})

const isControlled = computed(() => typeof props.modelValue === "string")
const currentValue = computed(() => isControlled.value ? props.modelValue : internalValue.value)

function onUpdateModelValue(value: string | number) {
  const nextValue = String(value)
  if (!isControlled.value) {
    internalValue.value = nextValue
  }
  emit("update:modelValue", nextValue)
}
</script>

<template>
  <Tabs
    :model-value="currentValue"
    :class="cn('w-full', props.class)"
    @update:model-value="onUpdateModelValue"
  >
    <TabsList :class="cn('w-full justify-start', props.listClass)">
      <div ref="triggerTarget" class="contents" />
    </TabsList>
    <slot />
  </Tabs>
</template>
