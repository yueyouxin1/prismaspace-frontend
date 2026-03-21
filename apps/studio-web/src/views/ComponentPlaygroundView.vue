<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@prismaspace/ui-shadcn/components/ui/card"
import { getComponentDemoBySlug } from "@app/data/component-demos"

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ""))
const demo = computed(() => getComponentDemoBySlug(slug.value))
</script>

<template>
  <main class="flex h-dvh w-full overflow-hidden bg-background">
    <section v-if="demo" class="min-h-0 flex-1 overflow-hidden">
      <component :is="demo.component" class="h-full w-full" />
    </section>

    <section v-else class="min-h-0 flex-1 overflow-auto">
      <div class="flex min-h-full items-center justify-center p-6">
        <Card>
          <CardHeader>
            <CardTitle>未找到对应组件</CardTitle>
          </CardHeader>
          <CardContent class="text-muted-foreground">
            请返回组件列表重新选择。
          </CardContent>
        </Card>
      </div>
    </section>
  </main>
</template>
