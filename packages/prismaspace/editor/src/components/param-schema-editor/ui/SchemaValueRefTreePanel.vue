<script setup lang="ts">
import { computed } from "vue";
import type { ValueRefPickerItem, ValueRefPickerViewModel } from "./value-ref-picker";
import { formatValueRefSummary, schemaTypeShortLabelMap } from "./runtime-editor-utils";
import { Badge } from "@prismaspace/ui-shadcn/components/ui/badge";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import { Input } from "@prismaspace/ui-shadcn/components/ui/input";
import { ScrollArea } from "@prismaspace/ui-shadcn/components/ui/scroll-area";
import { AlertCircle, ChevronDown, ChevronRight, Search, X } from "lucide-vue-next";
import { TreeItem, TreeRoot } from "reka-ui";

defineOptions({ name: "SchemaValueRefTreePanel" });

interface TreeInteractionEvent {
  preventDefault: () => void;
  detail?: {
    originalEvent?: PointerEvent | KeyboardEvent;
  };
}

const props = withDefaults(
  defineProps<{
    picker: ValueRefPickerViewModel;
    placeholder?: string;
    emptyText?: string;
    searchPlaceholder?: string;
  }>(),
  {
    placeholder: "请选择变量引用",
    emptyText: "没有可用的变量项",
    searchPlaceholder: "搜索变量 / 节点",
  },
);

const emit = defineEmits<{
  (event: "request-close"): void;
}>();

const selectedItem = computed(() => props.picker.selectedItem ?? undefined);
const selectedBadge = computed(() => {
  if (props.picker.selectedValidation.status === "missing") return "引用失效";
  if (props.picker.selectedValidation.status === "not-selectable") return "不可引用";
  if (props.picker.selectedValidation.status === "type-mismatch") return "类型不兼容";
  return "当前引用";
});
const selectedLabel = computed(() => {
  return props.picker.selectedItem?.label || formatValueRefSummary(props.picker.selected);
});

function onActivateItem(item: ValueRefPickerItem) {
  if (!item.ref) {
    if (item.children.length) props.picker.toggleExpand(item.key);
    return;
  }

  if (props.picker.selectItem(item)) {
    emit("request-close");
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
  <div class="flex min-h-0 flex-col gap-3">
    <div class="flex items-center gap-2 rounded-[12px] border border-[#e8e7ef] bg-[#f7f7fb] px-3 py-2">
      <Search class="size-4 shrink-0 text-[#9898a8]" />
      <Input
        :model-value="picker.query"
        :placeholder="searchPlaceholder"
        class="h-7 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
        @update:model-value="picker.setQuery(String($event))"
      />
      <Button
        v-if="picker.query"
        type="button"
        size="icon-sm"
        variant="ghost"
        class="size-6 rounded-full text-[#7f8094]"
        @click="picker.clearQuery"
      >
        <X class="size-3.5" />
      </Button>
    </div>

    <div
      v-if="picker.selected"
      :class="[
        'rounded-[12px] border px-3 py-2',
        picker.selectedValidation.status === 'ok'
          ? 'border-[#e9e7fb] bg-[#f6f3ff]'
          : 'border-[#ffd6db] bg-[#fff6f7]',
      ]"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p class="truncate text-[12px] font-medium text-[#504672]">{{ selectedLabel }}</p>
          <p class="truncate text-[11px] text-[#7a7497]">{{ picker.selectedSummary }}</p>
        </div>
        <Badge
          variant="secondary"
          :class="[
            'rounded-full',
            picker.selectedValidation.status === 'ok'
              ? 'bg-white/85 text-[#6b5eb8]'
              : 'bg-white/85 text-[#c44d5b]',
          ]"
        >
          {{ selectedBadge }}
        </Badge>
      </div>
      <p
        v-if="picker.selectedValidation.message"
        class="mt-2 flex items-center gap-1 text-[11px] text-[#c44d5b]"
      >
        <AlertCircle class="size-3.5 shrink-0" />
        {{ picker.selectedValidation.message }}
      </p>
    </div>

    <ScrollArea class="min-h-0 flex-1 rounded-[14px] border border-[#eceaf2] bg-white">
      <TreeRoot
        :items="picker.filteredItems"
        :model-value="selectedItem"
        :expanded="picker.expandedKeys"
        :get-key="(item) => item.key"
        :get-children="(item) => item.children"
        class="min-h-full"
        @update:expanded="picker.setExpandedKeys"
      >
        <template #default="{ flattenItems }">
          <div v-if="!flattenItems.length" class="px-4 py-10 text-center text-[13px] text-[#8f91a2]">
            {{ emptyText }}
          </div>

          <div v-else class="space-y-1 p-2">
            <TreeItem
              v-for="flatItem in flattenItems"
              :key="flatItem._id"
              v-bind="flatItem.bind"
              class="outline-none"
              @select="onItemSelect(flatItem.value, $event)"
              @toggle="onItemToggle($event)"
            >
              <template #default="{ isExpanded, isSelected }">
                <div
                  :class="[
                    'flex items-start gap-2 rounded-[10px] px-2 py-2 transition-colors',
                    isSelected ? 'bg-[#f3efff] text-[#3d3263]' : 'hover:bg-[#f6f6fb] text-[#2f3242]',
                    flatItem.value.ref && !picker.canSelect(flatItem.value) ? 'opacity-70' : '',
                  ]"
                >
                  <button
                    type="button"
                    :class="[
                      'mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-[6px] text-[#8a8ba1]',
                      flatItem.value.children.length ? 'hover:bg-[#f1eff8]' : 'cursor-default opacity-60',
                    ]"
                    @click.stop="flatItem.value.children.length ? picker.toggleExpand(flatItem.value.key) : undefined"
                  >
                    <ChevronDown v-if="flatItem.value.children.length && isExpanded" class="size-3.5" />
                    <ChevronRight v-else-if="flatItem.value.children.length" class="size-3.5" />
                    <span v-else class="size-1.5 rounded-full bg-[#d4d6df]" />
                  </button>

                  <button
                    type="button"
                    :disabled="Boolean(flatItem.value.ref) && !picker.canSelect(flatItem.value)"
                    class="flex min-w-0 flex-1 items-start gap-2 text-left disabled:cursor-not-allowed"
                    :style="{ paddingLeft: `${flatItem.level * 14}px` }"
                    @click.stop="onActivateItem(flatItem.value)"
                  >
                    <span class="min-w-0 flex-1">
                      <span class="flex items-center gap-2">
                        <span class="truncate text-[13px] font-medium">{{ flatItem.value.label }}</span>
                        <Badge
                          v-if="flatItem.value.schemaType"
                          variant="outline"
                          class="rounded-full border-[#e6e4f0] bg-[#f8f7fc] px-1.5 text-[10px] text-[#7e7a92]"
                        >
                          {{ schemaTypeShortLabelMap[flatItem.value.schemaType] }}
                        </Badge>
                        <Badge
                          v-if="flatItem.value.source"
                          variant="outline"
                          class="rounded-full border-[#e6e4f0] bg-[#f8f7fc] px-1.5 text-[10px] text-[#7e7a92]"
                        >
                          {{ flatItem.value.source }}
                        </Badge>
                        <Badge
                          v-if="flatItem.value.ref && !flatItem.value.selectable"
                          variant="outline"
                          class="rounded-full border-[#ffd6db] bg-[#fff7f8] px-1.5 text-[10px] text-[#c44d5b]"
                        >
                          不可引用
                        </Badge>
                        <Badge
                          v-if="flatItem.value.ref && !flatItem.value.compatibility.compatible"
                          variant="outline"
                          class="rounded-full border-[#ffd6db] bg-[#fff7f8] px-1.5 text-[10px] text-[#c44d5b]"
                        >
                          类型不兼容
                        </Badge>
                      </span>
                      <span class="mt-0.5 block truncate text-[11px] text-[#8d90a2]">
                        {{
                          flatItem.value.ref
                            ? flatItem.value.caption
                            : flatItem.value.children.length
                              ? `${flatItem.value.children.length} 个子项`
                              : placeholder
                        }}
                      </span>
                      <span
                        v-if="flatItem.value.ref && !flatItem.value.selectable && flatItem.value.selectableMessage"
                        class="mt-1 block text-[11px] text-[#c44d5b]"
                      >
                        {{ flatItem.value.selectableMessage }}
                      </span>
                      <span
                        v-else-if="flatItem.value.ref && !flatItem.value.compatibility.compatible && flatItem.value.compatibility.message"
                        class="mt-1 block text-[11px] text-[#c44d5b]"
                      >
                        {{ flatItem.value.compatibility.message }}
                      </span>
                    </span>
                  </button>
                </div>
              </template>
            </TreeItem>
          </div>
        </template>
      </TreeRoot>
    </ScrollArea>
  </div>
</template>
