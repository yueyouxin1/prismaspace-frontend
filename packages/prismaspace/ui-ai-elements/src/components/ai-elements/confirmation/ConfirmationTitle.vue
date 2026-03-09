<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { AlertDescription } from '@prismaspace/ui-shadcn/components/ui/alert'
import { cn } from '@prismaspace/ui-shadcn/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <AlertDescription
    :class="cn('inline', props.class)"
    v-bind="$attrs"
  >
    <slot />
  </AlertDescription>
</template>
