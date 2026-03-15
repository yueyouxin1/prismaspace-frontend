<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { SchemaType, ValueRefPickerItem, ValueRefPickerViewModel } from "@prismaspace/editor";
import { Badge } from "@prismaspace/ui-shadcn/components/ui/badge";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@prismaspace/ui-shadcn/components/ui/dropdown-menu";
import { Input } from "@prismaspace/ui-shadcn/components/ui/input";
import { ScrollArea } from "@prismaspace/ui-shadcn/components/ui/scroll-area";
import {
  Bot,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Play,
  Search,
  Settings2,
  UserRound,
} from "lucide-vue-next";
import { TreeItem, TreeRoot } from "reka-ui";

defineOptions({ name: "ParamSchemaCascadeValueRefPickerDemo" });

interface TreeInteractionEvent {
  preventDefault: () => void;
  detail?: {
    originalEvent?: PointerEvent | KeyboardEvent;
  };
}

const props = defineProps<{
  picker: ValueRefPickerViewModel;
  close: () => void;
}>();

const schemaTypeLabelMap: Record<SchemaType, string> = {
  string: "String",
  number: "Number",
  integer: "Integer",
  boolean: "Boolean",
  object: "Object",
  array: "Array",
};

const activeCategoryKey = ref("");
const activeBlockKey = ref("");

const categories = computed(() => props.picker.filteredItems.filter((item) => item.children.length > 0));
const activeCategory = computed(() => {
  return categories.value.find((item) => item.key === activeCategoryKey.value) ?? categories.value[0] ?? null;
});
const blocks = computed(() => activeCategory.value?.children ?? []);
const activeBlock = computed(() => {
  return blocks.value.find((item) => item.key === activeBlockKey.value) ?? blocks.value[0] ?? null;
});
const activeBlockTreeItems = computed(() => activeBlock.value?.children ?? []);
const treeSelectedItem = computed(() => {
  if (!activeBlock.value || !props.picker.selectedKey) return null;
  return findPickerItemByKey(activeBlockTreeItems.value, props.picker.selectedKey);
});

watch(
  categories,
  (nextCategories) => {
    const nextCategory =
      nextCategories.find((item) => item.key === activeCategoryKey.value)
      ?? nextCategories[0]
      ?? null;
    activeCategoryKey.value = nextCategory?.key ?? "";
  },
  { immediate: true },
);

watch(
  blocks,
  (nextBlocks) => {
    const nextBlock =
      nextBlocks.find((item) => item.key === activeBlockKey.value)
      ?? nextBlocks.find((item) => item.key === props.picker.selectedItem?.key)
      ?? nextBlocks[0]
      ?? null;
    activeBlockKey.value = nextBlock?.key ?? "";
  },
  { immediate: true },
);

function activateCategory(category: ValueRefPickerItem) {
  activeCategoryKey.value = category.key;
  activeBlockKey.value = category.children[0]?.key ?? "";
}

function activateBlock(category: ValueRefPickerItem, block: ValueRefPickerItem) {
  activeCategoryKey.value = category.key;
  activeBlockKey.value = block.key;
}

function selectItem(item: ValueRefPickerItem) {
  if (props.picker.selectItem(item)) {
    props.close();
  }
}

function selectActiveBlock() {
  if (!activeBlock.value || !props.picker.canSelect(activeBlock.value)) return;
  selectItem(activeBlock.value);
}

function onActivateTreeItem(item: ValueRefPickerItem) {
  if (!item.ref) {
    if (item.children.length) props.picker.toggleExpand(item.key);
    return;
  }

  selectItem(item);
}

function onTreeItemSelect(item: ValueRefPickerItem, event: TreeInteractionEvent) {
  event.preventDefault();
  const originalEvent = event.detail?.originalEvent;
  if (typeof PointerEvent !== "undefined" && originalEvent instanceof PointerEvent) return;
  onActivateTreeItem(item);
}

function onTreeItemToggle(event: TreeInteractionEvent) {
  const originalEvent = event.detail?.originalEvent;
  if (typeof PointerEvent !== "undefined" && originalEvent instanceof PointerEvent) {
    event.preventDefault();
  }
}

function categoryIcon(categoryKey: string) {
  if (categoryKey.includes("user")) return UserRound;
  if (categoryKey.includes("app")) return Boxes;
  return Settings2;
}

function blockIcon(blockKey: string) {
  if (blockKey.includes("start")) return Play;
  if (blockKey.includes("llm")) return Bot;
  return FolderTree;
}

function findPickerItemByKey(items: ValueRefPickerItem[], key: string): ValueRefPickerItem | null {
  for (const item of items) {
    if (item.key === key) return item;
    const child = findPickerItemByKey(item.children, key);
    if (child) return child;
  }
  return null;
}
</script>

<template>
  <div class="flex min-h-0 flex-col gap-3">
    <div class="rounded-[16px] border border-[#ece8f6] bg-[linear-gradient(180deg,#fcfbff_0%,#f8f6fd_100%)] p-3">
      <div class="flex items-center gap-2 rounded-[12px] border border-[#e7e5f3] bg-white px-3 py-2 shadow-xs">
        <Search class="size-4 shrink-0 text-[#8e90a1]" />
        <Input
          :model-value="picker.query"
          placeholder="搜索变量或引用路径"
          class="h-7 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
          @update:model-value="picker.setQuery(String($event))"
        />
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button type="button" variant="outline" class="h-9 gap-2 rounded-[12px] border-[#ddd8ef] bg-white pr-2 text-[#4f457f]">
              <component :is="activeCategory ? categoryIcon(activeCategory.key) : FolderTree" class="size-4" />
              <span class="max-w-[120px] truncate">{{ activeCategory?.label ?? "选择变量分组" }}</span>
              <ChevronRight class="size-3.5 text-[#8f8aa6]" />
              <span class="max-w-[120px] truncate text-[#6f6893]">{{ activeBlock?.label ?? "选择 Block" }}</span>
              <ChevronDown class="size-3.5 text-[#8f8aa6]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-64 rounded-[14px] border-[#e6e2f3] p-1.5">
            <DropdownMenuLabel class="text-[11px] text-[#8c87a1]">变量来源</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub v-for="category in categories" :key="category.key">
              <DropdownMenuSubTrigger class="rounded-[10px] px-2.5 py-2 text-[13px]">
                <component :is="categoryIcon(category.key)" class="mr-2 size-4 text-[#746aa7]" />
                <span class="flex-1 truncate">{{ category.label }}</span>
                <Badge variant="outline" class="rounded-full border-[#e6e3f0] bg-[#f8f7fc] px-1.5 text-[10px] text-[#7e7a92]">
                  {{ category.children.length }}
                </Badge>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent class="w-60 rounded-[14px] border-[#e6e2f3] p-1.5">
                <DropdownMenuLabel class="text-[11px] text-[#8c87a1]">{{ category.label }}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  v-for="block in category.children"
                  :key="block.key"
                  class="rounded-[10px] px-2.5 py-2 text-[13px]"
                  @select.prevent="activateBlock(category, block)"
                >
                  <component :is="blockIcon(block.key)" class="mr-2 size-4 text-[#746aa7]" />
                  <span class="flex-1 truncate">{{ block.label }}</span>
                  <Badge
                    v-if="block.schemaType"
                    variant="outline"
                    class="mr-1 rounded-full border-[#e6e3f0] bg-[#f8f7fc] px-1.5 text-[10px] text-[#7e7a92]"
                  >
                    {{ schemaTypeLabelMap[block.schemaType] }}
                  </Badge>
                  <Check v-if="activeBlock?.key === block.key" class="size-3.5 text-[#5b50c6]" />
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <Badge
          v-if="picker.selected"
          :class="[
            'rounded-full border px-2.5 py-1 text-[11px] font-medium',
            picker.selectedValidation.compatible
              ? 'border-[#ddd8ef] bg-white text-[#625991]'
              : 'border-[#ffd8dd] bg-[#fff7f8] text-[#c44d5b]',
          ]"
        >
          {{ picker.selectedValidation.compatible ? "当前引用有效" : "当前引用失配" }}
        </Badge>
      </div>
    </div>

    <div class="grid min-h-0 flex-1 gap-3 md:grid-cols-[196px_minmax(0,1fr)]">
      <div class="min-h-0 rounded-[16px] border border-[#ece8f6] bg-white">
        <div class="border-b border-[#f0edf7] px-3 py-2">
          <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-[#9892ad]">Blocks</p>
        </div>
        <ScrollArea class="h-[280px] min-h-0">
          <div class="space-y-1.5 p-2">
            <button
              v-for="block in blocks"
              :key="block.key"
              type="button"
              :class="[
                'flex w-full items-center gap-2 rounded-[12px] border px-3 py-2 text-left transition-colors',
                activeBlock?.key === block.key
                  ? 'border-[#cfc8ff] bg-[#f4f1ff] text-[#473a86]'
                  : 'border-transparent bg-[#faf9fd] text-[#665f7f] hover:border-[#ece8f6] hover:bg-[#f6f4fb]',
              ]"
              @click="activeCategory ? activateBlock(activeCategory, block) : undefined"
            >
              <component :is="blockIcon(block.key)" class="size-4 shrink-0" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px] font-medium">{{ block.label }}</span>
                <span class="mt-0.5 block truncate text-[11px] text-[#8f8aa6]">
                  {{ block.caption }}
                </span>
              </span>
            </button>
          </div>
        </ScrollArea>
      </div>

      <div class="flex min-h-0 flex-col rounded-[16px] border border-[#ece8f6] bg-white">
        <div v-if="activeBlock" class="border-b border-[#f0edf7] px-3 py-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <component :is="blockIcon(activeBlock.key)" class="size-4 shrink-0 text-[#6157a2]" />
                <p class="truncate text-[13px] font-semibold text-[#3f345f]">{{ activeBlock.label }}</p>
                <Badge
                  v-if="activeBlock.schemaType"
                  variant="outline"
                  class="rounded-full border-[#e6e3f0] bg-[#f8f7fc] px-1.5 text-[10px] text-[#7e7a92]"
                >
                  {{ schemaTypeLabelMap[activeBlock.schemaType] }}
                </Badge>
              </div>
              <p class="mt-1 truncate text-[11px] text-[#8f8aa6]">{{ activeBlock.caption }}</p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              class="rounded-[10px]"
              :disabled="!picker.canSelect(activeBlock)"
              @click="selectActiveBlock"
            >
              引用整块
            </Button>
          </div>

          <p
            v-if="activeBlock.ref && !activeBlock.compatibility.compatible && activeBlock.compatibility.message"
            class="mt-2 text-[11px] text-[#c44d5b]"
          >
            {{ activeBlock.compatibility.message }}
          </p>
        </div>

        <ScrollArea class="min-h-0 flex-1">
          <div v-if="!activeBlock" class="px-4 py-10 text-center text-[13px] text-[#8f91a2]">
            当前筛选结果下没有可用的 Block。
          </div>

          <TreeRoot
            v-else
            :items="activeBlockTreeItems"
            :model-value="treeSelectedItem ?? undefined"
            :expanded="picker.expandedKeys"
            :get-key="(item) => item.key"
            :get-children="(item) => item.children"
            class="min-h-full p-2"
            @update:expanded="picker.setExpandedKeys"
          >
            <template #default="{ flattenItems }">
              <div v-if="!flattenItems.length" class="px-4 py-10 text-center text-[13px] text-[#8f91a2]">
                当前 Block 下没有可引用的子节点。
              </div>

              <div v-else class="space-y-1">
                <TreeItem
                  v-for="flatItem in flattenItems"
                  :key="flatItem._id"
                  v-bind="flatItem.bind"
                  class="outline-none"
                  @select="onTreeItemSelect(flatItem.value, $event)"
                  @toggle="onTreeItemToggle($event)"
                >
                  <template #default="{ isExpanded, isSelected }">
                    <div
                      :class="[
                        'flex items-start gap-2 rounded-[12px] px-2.5 py-2 transition-colors',
                        isSelected ? 'bg-[#f3efff] text-[#403568]' : 'hover:bg-[#f6f4fb] text-[#2f3242]',
                        flatItem.value.ref && !picker.canSelect(flatItem.value) ? 'opacity-70' : '',
                      ]"
                    >
                      <button
                        type="button"
                        class="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-[6px] text-[#8a8ba1] hover:bg-[#f1eff8]"
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
                        @click.stop="onActivateTreeItem(flatItem.value)"
                      >
                        <span class="min-w-0 flex-1">
                          <span class="flex items-center gap-2">
                            <span class="truncate text-[13px] font-medium">{{ flatItem.value.label }}</span>
                            <Badge
                              v-if="flatItem.value.schemaType"
                              variant="outline"
                              class="rounded-full border-[#e6e3f0] bg-[#f8f7fc] px-1.5 text-[10px] text-[#7e7a92]"
                            >
                              {{ schemaTypeLabelMap[flatItem.value.schemaType] }}
                            </Badge>
                          </span>
                          <span class="mt-0.5 block truncate text-[11px] text-[#8d90a2]">
                            {{ flatItem.value.caption }}
                          </span>
                          <span
                            v-if="flatItem.value.ref && !flatItem.value.compatibility.compatible && flatItem.value.compatibility.message"
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
    </div>
  </div>
</template>
