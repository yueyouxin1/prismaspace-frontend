<script setup lang="ts">
import { DialogTrigger } from '@prismaspace/ui-shadcn/components/ui/dialog'
</script>

<template>
  <DialogTrigger v-bind="$attrs">
    <slot />
  </DialogTrigger>
</template>
