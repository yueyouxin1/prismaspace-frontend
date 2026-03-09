<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { HoverCardContent } from '@prismaspace/ui-shadcn/components/ui/hover-card'
import { cn } from '@prismaspace/ui-shadcn/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <HoverCardContent :class="cn('relative w-80 p-0', props.class)">
    <slot />
  </HoverCardContent>
</template>
