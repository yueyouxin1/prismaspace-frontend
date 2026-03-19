<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@prismaspace/ui-shadcn/components/ui/tooltip";
import { AlertCircle, ChevronDown, ChevronRight } from "lucide-vue-next";
import { TreeItem, TreeRoot } from "reka-ui";
import VariableTreePanelShell from "./VariableTreePanelShell.vue";
import type {
  DefaultVariableTreeItem,
  VariableTreeInsertValueResolver,
  VariableTreeNode,
} from "./types";
import {
  collectDefaultVariableTreeBranchKeys,
  filterDefaultVariableTree,
  flattenDefaultVariableTree,
  normalizeDefaultVariableTree,
} from "./utils";

defineOptions({ name: "DefaultVariableTreePanel" });

interface TreeInteractionEvent {
  preventDefault: () => void;
  detail?: {
    originalEvent?: PointerEvent | KeyboardEvent;
  };
}

const props = withDefaults(
  defineProps<{
    tree?: VariableTreeNode[];
    queryText?: string;
    title?: string;
    emptyText?: string;
    variant?: "embedded" | "popup";
    showClose?: boolean;
    closeLabel?: string;
    searchPlaceholder?: string;
    resolveInsertValue?: VariableTreeInsertValueResolver;
  }>(),
  {
    tree: () => [],
    queryText: "",
    title: "",
    emptyText: "没有匹配项",
    variant: "popup",
    showClose: true,
    closeLabel: "Esc",
    searchPlaceholder: "搜索变量 / 节点",
    resolveInsertValue: undefined,
  },
);

const emit = defineEmits<{
  (event: "pick", payload: { item: DefaultVariableTreeItem; node: VariableTreeNode; insertValue: string }): void;
  (event: "close"): void;
}>();

const manualExpandedKeys = ref<string[]>([]);
const activeKey = ref("");
const localQuery = ref(props.queryText);

const items = computed(() =>
  normalizeDefaultVariableTree(props.tree ?? [], {
    resolveInsertValue: props.resolveInsertValue,
  }),
);
const hasQuery = computed(() => localQuery.value.trim().length > 0);
const normalizedQuery = computed(() => localQuery.value.trim().toLowerCase());
const filteredItems = computed(() => {
  if (!hasQuery.value) {
    return items.value;
  }
  return filterDefaultVariableTree(items.value, normalizedQuery.value);
});
const expandedKeys = computed(() => {
  if (hasQuery.value) {
    return collectDefaultVariableTreeBranchKeys(filteredItems.value);
  }
  return manualExpandedKeys.value;
});
const expandedSet = computed(() => new Set(expandedKeys.value));
const flatItems = computed(() => flattenDefaultVariableTree(filteredItems.value, expandedSet.value, 0));
const selectableItems = computed(() => flatItems.value.filter((item) => item.selectable && item.insertValue));
const selectedItemModel = computed(() => {
  const item = findDefaultVariableTreeItemByKey(filteredItems.value, activeKey.value);
  if (!canActivateItem(item)) {
    return undefined;
  }
  return item;
});

watch(
  () => props.queryText,
  (nextValue) => {
    localQuery.value = nextValue;
  },
);

watch(
  items,
  (nextItems) => {
    const branchKeys = collectDefaultVariableTreeBranchKeys(nextItems);
    const validKeys = new Set(branchKeys);
    const nextExpanded = manualExpandedKeys.value.filter((key) => validKeys.has(key));

    if (!manualExpandedKeys.value.length) {
      manualExpandedKeys.value = branchKeys;
      return;
    }

    manualExpandedKeys.value = nextExpanded;
  },
  { immediate: true },
);

watch(
  flatItems,
  (nextItems) => {
    if (!activeKey.value) {
      return;
    }

    const activeItem = nextItems.find((item) => item.key === activeKey.value);
    if (!canActivateItem(activeItem)) {
      activeKey.value = "";
    }
  },
  { immediate: true },
);

function toggleExpand(key: string): void {
  if (hasQuery.value) {
    return;
  }

  const next = new Set(manualExpandedKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  manualExpandedKeys.value = [...next];
}

function focusNextSelectable(offset: 1 | -1): void {
  const items = selectableItems.value;
  if (!items.length) {
    activeKey.value = "";
    return;
  }

  const currentIndex = items.findIndex((item) => item.key === activeKey.value);
  if (currentIndex === -1) {
    activeKey.value = offset === 1 ? (items[0]?.key ?? "") : (items[items.length - 1]?.key ?? "");
    return;
  }

  const nextIndex = (currentIndex + offset + items.length) % items.length;
  activeKey.value = items[nextIndex]?.key ?? "";
}

function canActivateItem(
  item: Pick<DefaultVariableTreeItem, "selectable" | "insertValue"> | null | undefined,
): item is DefaultVariableTreeItem & { insertValue: string; selectable: true } {
  return Boolean(item?.selectable && item.insertValue);
}

function getItemIssue(item: Pick<DefaultVariableTreeItem, "selectable" | "selectableMessage">): string | null {
  if (item.selectable) {
    return null;
  }
  return item.selectableMessage ?? "当前节点不可引用。";
}

function onActivateItem(item: DefaultVariableTreeItem): void {
  if (!canActivateItem(item)) {
    return;
  }

  activeKey.value = item.key;
  emit("pick", {
    item,
    node: item.node,
    insertValue: item.insertValue,
  });
}

function onItemSelect(item: DefaultVariableTreeItem, event: TreeInteractionEvent): void {
  event.preventDefault();
  const originalEvent = event.detail?.originalEvent;
  if (typeof PointerEvent !== "undefined" && originalEvent instanceof PointerEvent) {
    return;
  }

  if (!canActivateItem(item)) {
    return;
  }

  onActivateItem(item);
}

function onItemToggle(event: TreeInteractionEvent): void {
  const originalEvent = event.detail?.originalEvent;
  if (typeof PointerEvent !== "undefined" && originalEvent instanceof PointerEvent) {
    event.preventDefault();
  }
}

function onKeydown(event: KeyboardEvent): void {
  event.stopPropagation();

  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }

  if (!selectableItems.value.length) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusNextSelectable(1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    focusNextSelectable(-1);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    const target = selectableItems.value.find((item) => item.key === activeKey.value);
    if (target) {
      onActivateItem(target);
    }
  }
}

function findDefaultVariableTreeItemByKey(
  nodes: DefaultVariableTreeItem[],
  key: string,
): DefaultVariableTreeItem | null {
  if (!key) {
    return null;
  }

  for (const node of nodes) {
    if (node.key === key) {
      return node;
    }
    const child = findDefaultVariableTreeItemByKey(node.children, key);
    if (child) {
      return child;
    }
  }

  return null;
}
</script>

<template>
  <VariableTreePanelShell
    :title="title"
    :variant="variant"
    :show-close="showClose"
    :close-label="closeLabel"
    :query="localQuery"
    :search-placeholder="searchPlaceholder"
    show-search
    content-class="max-h-[260px]"
    class="default-variable-tree-panel"
    @update:query="localQuery = $event"
    @close="emit('close')"
  >
    <TooltipProvider :delay-duration="200">
      <TreeRoot
        :items="filteredItems"
        :model-value="selectedItemModel"
        :expanded="expandedKeys"
        :get-key="(item) => item.key"
        :get-children="(item) => item.children"
        class="min-h-full"
        @update:expanded="manualExpandedKeys = hasQuery ? manualExpandedKeys : [...new Set($event)]"
      >
        <template #default="{ flattenItems: treeItems }">
          <div
            class="min-h-full outline-none"
            tabindex="0"
            @keydown="onKeydown"
          >
            <div v-if="!treeItems.length" class="px-4 py-10 text-center text-sm text-muted-foreground">
              {{ emptyText }}
            </div>

            <div v-else class="space-y-1 p-2">
              <TreeItem
                v-for="flatItem in treeItems"
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
                      isSelected
                        ? 'bg-accent text-accent-foreground'
                        : flatItem.value.selectable
                          ? 'text-foreground hover:bg-accent/60'
                          : 'text-muted-foreground opacity-65',
                    ]"
                  >
                    <button
                      type="button"
                      :class="[
                        'inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground',
                        flatItem.value.children.length ? 'hover:bg-accent' : 'cursor-default opacity-50',
                      ]"
                      @click.stop="flatItem.value.children.length ? toggleExpand(flatItem.value.key) : undefined"
                    >
                      <ChevronDown v-if="flatItem.value.children.length && isExpanded" class="size-3.5" />
                      <ChevronRight v-else-if="flatItem.value.children.length" class="size-3.5" />
                      <span v-else class="size-3.5" />
                    </button>

                    <button
                      type="button"
                      class="flex min-w-0 flex-1 items-center gap-2 text-left"
                      :class="flatItem.value.selectable ? '' : 'cursor-not-allowed text-muted-foreground'"
                      :aria-disabled="!flatItem.value.selectable"
                      :title="flatItem.value.caption || flatItem.value.label"
                      @click.stop="onActivateItem(flatItem.value)"
                    >
                      <span class="min-w-0 flex flex-1 items-center gap-1.5">
                        <span class="truncate">{{ flatItem.value.label }}</span>

                        <Tooltip v-if="getItemIssue(flatItem.value)">
                          <TooltipTrigger as-child>
                            <span class="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                              <AlertCircle class="size-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {{ getItemIssue(flatItem.value) }}
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
          </div>
        </template>
      </TreeRoot>
    </TooltipProvider>
  </VariableTreePanelShell>
</template>

<style scoped>
.default-variable-tree-panel {
  min-width: 260px;
  max-width: min(360px, calc(100vw - 24px));
  max-height: 360px;
}
</style>
