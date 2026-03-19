<script setup lang="ts">
import { computed, useSlots } from "vue";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import { Input } from "@prismaspace/ui-shadcn/components/ui/input";
import { ScrollArea } from "@prismaspace/ui-shadcn/components/ui/scroll-area";
import { Search, X } from "lucide-vue-next";

defineOptions({ name: "VariableTreePanelShell" });

const props = withDefaults(
  defineProps<{
    variant?: "embedded" | "popup";
    title?: string;
    showClose?: boolean;
    closeLabel?: string;
    showSearch?: boolean;
    query?: string;
    searchPlaceholder?: string;
    contentClass?: string;
    footerClass?: string;
  }>(),
  {
    variant: "embedded",
    title: "",
    showClose: false,
    closeLabel: "Esc",
    showSearch: false,
    query: "",
    searchPlaceholder: "搜索变量 / 节点",
    contentClass: "",
    footerClass: "border-t px-3 py-2 text-xs text-muted-foreground",
  },
);

const emit = defineEmits<{
  (event: "update:query", value: string): void;
  (event: "close"): void;
}>();

const slots = useSlots();

const showHeader = computed(() => {
  return Boolean(props.title || props.showClose || slots.header || slots["header-actions"]);
});

const rootClass = computed(() => {
  if (props.variant === "popup") {
    return "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background shadow-xl";
  }
  return "flex min-h-0 flex-col overflow-hidden rounded-lg bg-background";
});
</script>

<template>
  <div :class="rootClass">
    <div v-if="showHeader" class="flex items-center justify-between gap-2 border-b px-3 py-2">
      <div class="min-w-0 flex-1">
        <slot name="header">
          <p v-if="title" class="truncate text-xs font-medium text-muted-foreground">
            {{ title }}
          </p>
        </slot>
      </div>

      <slot name="header-actions">
        <Button
          v-if="showClose"
          type="button"
          size="sm"
          variant="ghost"
          class="h-6 rounded px-2 py-0.5 text-xs text-muted-foreground"
          @click="emit('close')"
        >
          {{ closeLabel }}
        </Button>
      </slot>
    </div>

    <div v-if="showSearch" class="flex items-center gap-2 border-b px-3">
      <Search class="size-4 shrink-0 text-muted-foreground" />
      <Input
        :model-value="query"
        :placeholder="searchPlaceholder"
        class="h-10 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
        @update:model-value="emit('update:query', String($event))"
      />
      <Button
        v-if="query"
        type="button"
        size="icon-sm"
        variant="ghost"
        class="size-7 rounded-sm"
        @click="emit('update:query', '')"
      >
        <X class="size-3.5" />
      </Button>
    </div>

    <ScrollArea class="min-h-0 flex-1">
      <div :class="contentClass">
        <slot />
      </div>
    </ScrollArea>

    <div v-if="$slots.footer" :class="footerClass">
      <slot name="footer" />
    </div>
  </div>
</template>

