<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CollapsibleContent } from '@prismaspace/ui-shadcn/components/ui/collapsible'
import { cn } from '@prismaspace/ui-shadcn/lib/utils'

type CommitContentProps = InstanceType<typeof CollapsibleContent>['$props']

interface Props extends /* @vue-ignore */ CommitContentProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <CollapsibleContent
    :class="cn('border-t p-3', props.class)"
    v-bind="$attrs"
  >
    <slot />
  </CollapsibleContent>
</template>
