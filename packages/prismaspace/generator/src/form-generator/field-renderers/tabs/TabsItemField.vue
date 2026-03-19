<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, inject, onBeforeUnmount, watch } from "vue"
import { cn } from "@prismaspace/ui-shadcn/lib/utils"
import { TabsContent } from "@prismaspace/ui-shadcn/components/ui/tabs"
import { formGeneratorTabsTriggerPortalKey } from "../../injection-keys"

const props = withDefaults(defineProps<{
  itemId?: string
  title?: string
  value?: string
  disabled?: boolean
  class?: HTMLAttributes["class"]
  triggerClass?: HTMLAttributes["class"]
  contentClass?: HTMLAttributes["class"]
}>(), {
  title: "Tab",
  value: "tab-item",
  disabled: false,
  class: "",
  triggerClass: "",
  contentClass: "",
})

const triggerPortal = inject(formGeneratorTabsTriggerPortalKey, undefined)
const triggerClassName = computed(() => typeof props.triggerClass === "string" ? props.triggerClass : undefined)

watch(
  () => ({
    id: props.itemId,
    title: props.title,
    value: props.value,
    disabled: props.disabled,
    triggerClass: triggerClassName.value,
  }),
  (nextItem, previousItem) => {
    if (!triggerPortal) {
      return
    }

    if (previousItem?.id && previousItem.id !== nextItem.id) {
      triggerPortal.removeItem(previousItem.id)
    }

    if (!nextItem.id) {
      return
    }

    triggerPortal.upsertItem({
      id: nextItem.id,
      title: nextItem.title,
      value: nextItem.value,
      disabled: nextItem.disabled,
      triggerClass: nextItem.triggerClass,
    })
  },
  {
    immediate: true,
    flush: "post",
  },
)

onBeforeUnmount(() => {
  if (triggerPortal && props.itemId) {
    triggerPortal.removeItem(props.itemId)
  }
})
</script>

<template>
  <TabsContent :value="value" :class="cn(props.class, props.contentClass)">
    <div class="space-y-4">
      <slot />
    </div>
  </TabsContent>
</template>
