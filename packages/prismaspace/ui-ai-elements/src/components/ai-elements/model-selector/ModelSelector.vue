<script setup lang="ts">
import { Dialog } from '@prismaspace/ui-shadcn/components/ui/dialog'
</script>

<template>
  <Dialog v-bind="$attrs">
    <slot />
  </Dialog>
</template>
