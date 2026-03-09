<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CommandItem } from '@prismaspace/ui-shadcn/components/ui/command'
import { cn } from '@prismaspace/ui-shadcn/lib/utils'

type ModelSelectorItemProps = InstanceType<typeof CommandItem>['$props']

interface Props extends /* @vue-ignore */ ModelSelectorItemProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <CommandItem v-bind="props" :class="cn(props.class)">
    <slot />
  </CommandItem>
</template>
