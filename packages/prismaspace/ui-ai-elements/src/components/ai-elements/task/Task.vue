<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import {
  Collapsible,
} from '@prismaspace/ui-shadcn/components/ui/collapsible'
import { cn } from '@prismaspace/ui-shadcn/lib/utils'
import { provide, ref } from 'vue'

interface TaskProps {
  defaultOpen?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<TaskProps>(), {
  defaultOpen: true,
})

const isOpen = ref(props.defaultOpen)

function toggleOpen() {
  isOpen.value = !isOpen.value
}

provide('isOpen', isOpen)
provide('toggle', toggleOpen)
</script>

<template>
  <Collapsible :default-open="isOpen" :class="cn(props.class)" as-child v-bind="$attrs">
    <slot :is-open="isOpen" :toggle="toggleOpen" />
  </collapsible>
</template>
