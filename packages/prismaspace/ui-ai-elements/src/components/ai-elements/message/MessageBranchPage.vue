<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ButtonGroupText } from '@prismaspace/ui-shadcn/components/ui/button-group'
import { cn } from '@prismaspace/ui-shadcn/lib/utils'
import { useMessageBranchContext } from './context'

interface Props {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const { currentBranch, totalBranches } = useMessageBranchContext()
</script>

<template>
  <ButtonGroupText
    :class="
      cn(
        'border-none bg-transparent text-muted-foreground shadow-none',
        props.class,
      )
    "
    v-bind="$attrs"
  >
    {{ currentBranch + 1 }} of {{ totalBranches }}
  </ButtonGroupText>
</template>
