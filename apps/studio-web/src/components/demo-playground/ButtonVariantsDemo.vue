<script setup lang="ts">
import { Button } from "@prismaspace/ui-shadcn/components/ui/button"
import DemoPlaygroundPanel from "@app/components/demo-playground/DemoPlaygroundPanel.vue"
</script>

<template>
  <div class="relative h-full w-full overflow-auto bg-background">
    <DemoPlaygroundPanel
      title="Button"
      description="展示按钮的 variant 与 size 组合，便于统一交互规范。"
    />

    <div class="flex min-h-full items-center justify-center p-6 md:p-10">
      <div class="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
        <section class="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
          <h3 class="text-lg font-semibold">
            Variants
          </h3>
          <div class="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">
              Secondary
            </Button>
            <Button variant="outline">
              Outline
            </Button>
            <Button variant="ghost">
              Ghost
            </Button>
            <Button variant="destructive">
              Destructive
            </Button>
            <Button variant="link">
              Link
            </Button>
          </div>
        </section>

        <section class="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
          <h3 class="text-lg font-semibold">
            Sizes
          </h3>
          <div class="flex flex-wrap items-center gap-3">
            <Button size="sm">
              Small
            </Button>
            <Button size="default">
              Default
            </Button>
            <Button size="lg">
              Large
            </Button>
            <Button size="icon" aria-label="Icon style button">
              +
            </Button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
