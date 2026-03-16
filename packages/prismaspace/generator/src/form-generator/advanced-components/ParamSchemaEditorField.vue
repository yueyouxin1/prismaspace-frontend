<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from "vue";
import {
  ParamSchemaRegularEditor,
  type ParameterSchema,
  type ParamSchemaFieldVisibilityOverrides,
  type ParamSchemaRuntimeMode,
  type SchemaEditorAction,
  type SchemaEditorState,
  type SchemaNode,
  type VariableTreeNode,
} from "@prismaspace/editor";
import { Badge } from "@prismaspace/ui-shadcn/components/ui/badge";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import { cn } from "@prismaspace/ui-shadcn/lib/utils";
import { AlertCircle, Copy, Plus, Redo2, Undo2 } from "lucide-vue-next";
import {
  formGeneratorHeaderActionsPortalKey,
  formGeneratorValueRefTreeKey,
} from "../injection-keys";

type ParamSchemaExportKind = "parameter" | "json-schema" | "json";

type ParamSchemaEditorHeaderState = {
  title: string;
  modeLabel: string;
  rootCount: number;
  issueCount: number;
  issueTitle: string;
  canAddRoot: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

type ParamSchemaEditorExposed = {
  addRootProperty: () => void;
  undo: () => void;
  redo: () => void;
  copyExport: (kind: ParamSchemaExportKind) => Promise<void>;
  getHeaderState: () => ParamSchemaEditorHeaderState;
};

const props = withDefaults(
  defineProps<{
    modelValue?: ParameterSchema[];
    state?: SchemaEditorState;
    dispatch?: (action: SchemaEditorAction) => void;
    canEdit?: (node: SchemaNode) => boolean;
    roleOptions?: string[];
    runtimeMode?: ParamSchemaRuntimeMode;
    valueRefTree?: VariableTreeNode[];
    fieldVisibility?: ParamSchemaFieldVisibilityOverrides;
    showHeader?: boolean;
    headerTitle?: string;
    class?: string;
  }>(),
  {
    modelValue: () => [],
    runtimeMode: "bind",
    roleOptions: () => [],
    valueRefTree: undefined,
    fieldVisibility: undefined,
    showHeader: undefined,
    headerTitle: undefined,
    class: "",
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: ParameterSchema[]): void;
}>();

const editorRef = ref<ParamSchemaEditorExposed | null>(null);
const injectedValueRefTree = inject(formGeneratorValueRefTreeKey, undefined);
const headerPortal = inject(formGeneratorHeaderActionsPortalKey, undefined);
const headerState = ref<ParamSchemaEditorHeaderState>({
  title: props.headerTitle ?? "BIND",
  modeLabel: String(props.runtimeMode ?? "bind").toUpperCase(),
  rootCount: Array.isArray(props.modelValue) ? props.modelValue.length : 0,
  issueCount: 0,
  issueTitle: "",
  canAddRoot: false,
  canUndo: false,
  canRedo: false,
});

const resolvedValueRefTree = computed<VariableTreeNode[]>(() => {
  return props.valueRefTree ?? [...(injectedValueRefTree ?? [])];
});

const headerTeleportTarget = computed(() => headerPortal?.target.value ?? null);
const canTeleportHeaderActions = computed(() => Boolean(headerTeleportTarget.value));
const resolvedShowHeader = computed(() => {
  if (props.showHeader === false) {
    return false;
  }
  return !canTeleportHeaderActions.value;
});

function patchHeaderState(nextState: ParamSchemaEditorHeaderState) {
  const current = headerState.value;
  if (
    current.title === nextState.title &&
    current.modeLabel === nextState.modeLabel &&
    current.rootCount === nextState.rootCount &&
    current.issueCount === nextState.issueCount &&
    current.issueTitle === nextState.issueTitle &&
    current.canAddRoot === nextState.canAddRoot &&
    current.canUndo === nextState.canUndo &&
    current.canRedo === nextState.canRedo
  ) {
    return;
  }

  headerState.value = nextState;
}

async function refreshHeaderState() {
  await nextTick();
  const nextState = editorRef.value?.getHeaderState();
  if (!nextState) {
    return;
  }
  patchHeaderState(nextState);
}

watch(
  [
    () => props.modelValue,
    () => props.state,
    () => props.runtimeMode,
    () => props.showHeader,
    () => props.headerTitle,
    resolvedValueRefTree,
    headerTeleportTarget,
  ],
  () => {
    void refreshHeaderState();
  },
  { deep: true, immediate: true },
);

function emitModelValue(value: ParameterSchema[]) {
  emit("update:modelValue", value);
  void refreshHeaderState();
}

function addRootProperty() {
  editorRef.value?.addRootProperty();
}

function undo() {
  editorRef.value?.undo();
}

function redo() {
  editorRef.value?.redo();
}

function copyParameterSchema() {
  void editorRef.value?.copyExport("parameter");
}
</script>

<template>
  <Teleport v-if="canTeleportHeaderActions && headerTeleportTarget" :to="headerTeleportTarget">
    <div class="flex items-center gap-1.5" @click.stop>
      <Badge variant="secondary">
        {{ headerState.modeLabel }}
      </Badge>
      <Badge variant="secondary">
        {{ headerState.rootCount }} 项
      </Badge>
      <Badge v-if="headerState.issueCount" variant="destructive" :title="headerState.issueTitle">
        <AlertCircle class="size-3.5" />
        {{ headerState.issueCount }}
      </Badge>
      <Button
        v-if="headerState.canAddRoot"
        type="button"
        size="icon-sm"
        variant="ghost"
        title="新增顶层参数"
        @click.stop="addRootProperty"
      >
        <Plus class="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        :disabled="!headerState.canUndo"
        title="撤销"
        @click.stop="undo"
      >
        <Undo2 class="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        :disabled="!headerState.canRedo"
        title="重做"
        @click.stop="redo"
      >
        <Redo2 class="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        title="复制 ParameterSchema"
        @click.stop="copyParameterSchema"
      >
        <Copy class="size-4" />
      </Button>
    </div>
  </Teleport>

  <ParamSchemaRegularEditor
    ref="editorRef"
    :model-value="modelValue"
    :state="state"
    :dispatch="dispatch"
    :can-edit="canEdit"
    :role-options="roleOptions"
    :runtime-mode="runtimeMode"
    :value-ref-tree="resolvedValueRefTree"
    :field-visibility="fieldVisibility"
    :show-header="resolvedShowHeader"
    :header-title="headerTitle"
    :class="cn('min-h-[520px]', props.class)"
    @update:model-value="emitModelValue"
  />
</template>
