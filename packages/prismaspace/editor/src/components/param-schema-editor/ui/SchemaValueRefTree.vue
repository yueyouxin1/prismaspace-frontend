<script setup lang="ts">
import { computed } from "vue";
import type { ValueRefPickerItem, ValueRefPickerViewModel } from "./value-ref-picker";
import { getValueRefPickerItemIssue } from "./value-ref-picker";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@prismaspace/ui-shadcn/components/ui/tooltip";
import { AlertCircle, ChevronDown, ChevronRight } from "lucide-vue-next";
import { TreeItem, TreeRoot } from "reka-ui";

defineOptions({ name: "SchemaValueRefTree" });

interface TreeInteractionEvent {
  preventDefault: () => void;
  detail?: {
    originalEvent?: PointerEvent | KeyboardEvent;
  };
}

const props = withDefaults(
  defineProps<{
    picker: ValueRefPickerViewModel;
    items: ValueRefPickerItem[];
    emptyText?: string;
    selectedItem?: ValueRefPickerItem | null;
  }>(),
  {
    emptyText: "没有可用的变量项",
    selectedItem: null,
  },
);

const emit = defineEmits<{
  (event: "request-close"): void;
}>();

const selectedItemModel = computed(() => props.selectedItem ?? props.picker.selectedItem ?? undefined);

function onActivateItem(item: ValueRefPickerItem) {
  if (!item.ref) {
    if (item.children.length) props.picker.toggleExpand(item.key);
    return;
  }

  if (props.picker.canSelect(item)) {
    if (props.picker.selectItem(item)) {
      emit("request-close");
    }
    return;
  }

  if (item.children.length) {
    props.picker.toggleExpand(item.key);
  }
}

function onItemSelect(item: ValueRefPickerItem, event: TreeInteractionEvent) {
  event.preventDefault();
  const originalEvent = event.detail?.originalEvent;
  if (typeof PointerEvent !== "undefined" && originalEvent instanceof PointerEvent) return;
  onActivateItem(item);
}

function onItemToggle(event: TreeInteractionEvent) {
  const originalEvent = event.detail?.originalEvent;
  if (typeof PointerEvent !== "undefined" && originalEvent instanceof PointerEvent) {
    event.preventDefault();
  }
}
</script>

<template>
  <TreeRoot
    :items="items"
    :model-value="selectedItemModel"
    :expanded="picker.expandedKeys"
    :get-key="(item) => item.key"
    :get-children="(item) => item.children"
    class="min-h-full"
    @update:expanded="picker.setExpandedKeys"
  >
    <template #default="{ flattenItems }">
      <div v-if="!flattenItems.length" class="px-4 py-10 text-center text-sm text-muted-foreground">
        {{ emptyText }}
      </div>

      <div v-else class="space-y-1 p-2">
        <TreeItem
          v-for="flatItem in flattenItems"
          :key="flatItem._id"
          :style="{ 'padding-left': `${flatItem.level - 1}rem` }"
          v-bind="flatItem.bind"
          class="outline-none"
          @select="onItemSelect(flatItem.value, $event)"
          @toggle="onItemToggle($event)"
        >
          <template #default="{ isExpanded, isSelected }">
            <div
              :class="[
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                isSelected ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/60',
                flatItem.value.ref && !picker.canSelect(flatItem.value) && !flatItem.value.children.length ? 'opacity-65' : '',
              ]"
            >
              <button
                type="button"
                :class="[
                  'inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground',
                  flatItem.value.children.length ? 'hover:bg-accent' : 'cursor-default opacity-50',
                ]"
                @click.stop="flatItem.value.children.length ? picker.toggleExpand(flatItem.value.key) : undefined"
              >
                <ChevronDown v-if="flatItem.value.children.length && isExpanded" class="size-3.5" />
                <ChevronRight v-else-if="flatItem.value.children.length" class="size-3.5" />
                <span v-else class="size-3.5" />
              </button>

              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-2 text-left"
                :class="flatItem.value.ref && !picker.canSelect(flatItem.value) && !flatItem.value.children.length ? 'cursor-not-allowed' : ''"
                :title="flatItem.value.caption || flatItem.value.label"
                @click.stop="onActivateItem(flatItem.value)"
              >
                <span class="min-w-0 flex flex-1 items-center gap-1.5">
                  <span class="truncate">{{ flatItem.value.label }}</span>

                  <Tooltip v-if="getValueRefPickerItemIssue(flatItem.value)">
                    <TooltipTrigger as-child>
                      <span class="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                        <AlertCircle class="size-3.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {{ getValueRefPickerItemIssue(flatItem.value) }}
                    </TooltipContent>
                  </Tooltip>
                </span>

                <span
                  v-if="flatItem.value.schemaType"
                  class="shrink-0 text-[11px] font-medium text-muted-foreground"
                >
                  {{ flatItem.value.schemaType }}
                </span>
              </button>
            </div>
          </template>
        </TreeItem>
      </div>
    </template>
  </TreeRoot>
</template>
