<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, provide, ref } from "vue"
import { cn } from "@prismaspace/ui-shadcn/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@prismaspace/ui-shadcn/components/ui/tabs"
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
const tabItems = ref<Array<{
  id: string
  title: string
  value: string
  disabled: boolean
  triggerClass?: string
}>>([])

provide(formGeneratorTabsTriggerPortalKey, {
  upsertItem(item) {
    const index = tabItems.value.findIndex((entry) => entry.id === item.id)
    if (index >= 0) {
      const currentItem = tabItems.value[index]
      if (
        currentItem
        && currentItem.title === item.title
        && currentItem.value === item.value
        && currentItem.disabled === item.disabled
        && currentItem.triggerClass === item.triggerClass
      ) {
        return
      }
      tabItems.value.splice(index, 1, item)
      return
    }
    tabItems.value.push(item)
  },
  removeItem(id) {
    const index = tabItems.value.findIndex((entry) => entry.id === id)
    if (index >= 0) {
      tabItems.value.splice(index, 1)
    }
  },
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
      <TabsTrigger
        v-for="item in tabItems"
        :key="item.id"
        :value="item.value"
        :disabled="item.disabled"
        :class="cn(item.triggerClass)"
      >
        {{ item.title }}
      </TabsTrigger>
    </TabsList>
    <slot />
  </Tabs>
</template>
