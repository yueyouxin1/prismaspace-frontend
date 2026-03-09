<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { CollapsibleTrigger } from '@prismaspace/ui-shadcn/components/ui/collapsible'
import { cn } from '@prismaspace/ui-shadcn/lib/utils'
import { ChevronsUpDownIcon } from 'lucide-vue-next'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <CollapsibleTrigger as-child>
    <Button
      :class="cn('size-8', props.class)"
      data-slot="plan-trigger"
      size="icon"
      variant="ghost"
    >
      <ChevronsUpDownIcon class="size-4" />
      <span class="sr-only">Toggle plan</span>
    </Button>
  </CollapsibleTrigger>
</template>
