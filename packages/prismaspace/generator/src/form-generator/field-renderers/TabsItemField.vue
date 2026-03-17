<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, inject } from "vue"
import { cn } from "@prismaspace/ui-shadcn/lib/utils"
import { TabsContent, TabsTrigger } from "@prismaspace/ui-shadcn/components/ui/tabs"
import { formGeneratorTabsTriggerPortalKey } from "../injection-keys"

const props = withDefaults(defineProps<{
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
const triggerTarget = computed(() => triggerPortal?.target.value ?? null)
</script>

<template>
  <Teleport v-if="triggerTarget" :to="triggerTarget">
    <TabsTrigger :value="value" :disabled="disabled" :class="cn(props.triggerClass)">
      {{ title }}
    </TabsTrigger>
  </Teleport>

  <TabsContent :value="value" :class="cn(props.class, props.contentClass)">
    <div class="space-y-4">
      <slot />
    </div>
  </TabsContent>
</template>
