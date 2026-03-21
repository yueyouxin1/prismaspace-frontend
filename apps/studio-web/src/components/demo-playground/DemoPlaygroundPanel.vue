<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from "vue"
import { RouterLink } from "vue-router"
import { Badge } from "@prismaspace/ui-shadcn/components/ui/badge"
import { Button } from "@prismaspace/ui-shadcn/components/ui/button"
import { IconArrowLeft, IconChevronLeft, IconChevronRight, IconGripVertical } from "@tabler/icons-vue"

const props = withDefaults(defineProps<{
  title: string
  description?: string
  badge?: string
  defaultExpanded?: boolean
}>(), {
  description: undefined,
  badge: "Playground",
  defaultExpanded: true,
})

const slots = useSlots()
const panelRef = ref<HTMLElement>()
const navExpanded = ref(props.defaultExpanded)
const menuX = ref(16)
const menuY = ref(16)

let dragging = false
let startX = 0
let startY = 0
let originX = 0
let originY = 0

const hasContent = computed(() => Boolean(slots.default))

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const clampPosition = (): void => {
  const panelWidth = panelRef.value?.offsetWidth ?? 320
  const panelHeight = panelRef.value?.offsetHeight ?? 56
  const maxX = Math.max(8, window.innerWidth - panelWidth - 8)
  const maxY = Math.max(8, window.innerHeight - panelHeight - 8)

  menuX.value = clamp(menuX.value, 8, maxX)
  menuY.value = clamp(menuY.value, 8, maxY)
}

const menuStyle = computed(() => ({
  left: `${menuX.value}px`,
  top: `${menuY.value}px`,
}))

const onPointerMove = (event: PointerEvent) => {
  if (!dragging) {
    return
  }

  const deltaX = event.clientX - startX
  const deltaY = event.clientY - startY

  menuX.value = originX + deltaX
  menuY.value = originY + deltaY
  clampPosition()
}

const stopDrag = () => {
  dragging = false
  window.removeEventListener("pointermove", onPointerMove)
  window.removeEventListener("pointerup", onPointerUp)
}

const onPointerUp = () => {
  stopDrag()
}

const onDragHandlePointerDown = (event: PointerEvent) => {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return
  }

  dragging = true
  startX = event.clientX
  startY = event.clientY
  originX = menuX.value
  originY = menuY.value

  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
}

const handleWindowResize = () => {
  clampPosition()
}

watch(navExpanded, async () => {
  await nextTick()
  clampPosition()
})

watch(
  () => [props.title, props.description, hasContent.value],
  async () => {
    await nextTick()
    clampPosition()
  },
)

onMounted(async () => {
  await nextTick()
  clampPosition()
  window.addEventListener("resize", handleWindowResize)
})

onBeforeUnmount(() => {
  stopDrag()
  window.removeEventListener("resize", handleWindowResize)
})
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-[1000]">
    <div
      ref="panelRef"
      class="pointer-events-auto absolute max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border bg-background/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/85"
      :class="navExpanded ? 'w-[min(24rem,calc(100vw-1rem))]' : 'w-auto'"
      :style="menuStyle"
    >
      <div class="flex items-start gap-2 border-b px-3 py-2.5">
        <button
          type="button"
          class="mt-0.5 flex h-8 w-8 cursor-move items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="拖拽面板"
          aria-label="拖拽面板"
          @pointerdown.prevent="onDragHandlePointerDown"
        >
          <IconGripVertical class="size-4" />
        </button>

        <RouterLink to="/components" aria-label="返回组件列表" title="返回组件列表">
          <Button variant="ghost" size="icon-sm">
            <IconArrowLeft class="size-4" />
          </Button>
        </RouterLink>

        <div v-if="navExpanded" class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h1 class="truncate text-sm font-semibold tracking-tight">
              {{ title }}
            </h1>
            <Badge variant="secondary" class="rounded-full px-2 py-0.5 text-[11px]">
              {{ badge }}
            </Badge>
          </div>

          <p v-if="description" class="mt-1 text-xs leading-5 text-muted-foreground">
            {{ description }}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          :aria-label="navExpanded ? '收起面板' : '展开面板'"
          :title="navExpanded ? '收起面板' : '展开面板'"
          @click="navExpanded = !navExpanded"
        >
          <IconChevronLeft v-if="navExpanded" class="size-4" />
          <IconChevronRight v-else class="size-4" />
        </Button>
      </div>

      <div
        v-if="navExpanded && hasContent"
        class="max-h-[min(65vh,calc(100dvh-5rem))] overflow-auto px-3 py-3"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
