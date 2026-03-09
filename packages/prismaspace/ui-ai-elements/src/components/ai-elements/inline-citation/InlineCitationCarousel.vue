<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Carousel } from '@prismaspace/ui-shadcn/components/ui/carousel'
import { cn } from '@prismaspace/ui-shadcn/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <Carousel :class="cn('w-full', props.class)">
    <slot />
  </Carousel>
</template>
