<script setup lang="ts">
import { computed, ref } from "vue";
import {
  ParamSchemaRegularEditor,
  type ParamSchemaRuntimeMode,
  type VariableTreeNode,
  useParamSchemaEditor,
} from "@prismaspace/editor";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@prismaspace/ui-shadcn/components/ui/card";
const runtimeMode = ref<ParamSchemaRuntimeMode>("define");

const regularEditor = useParamSchemaEditor();

const roleOptions = ["system", "input", "output"];

const valueRefTree: VariableTreeNode[] = [
  {
    id: "start",
    label: "start",
    blockID: "start",
    children: [
      { id: "start.user.id", label: "user.id", path: "user.id" },
      { id: "start.user.name", label: "user.name", path: "user.name" },
      { id: "start.ctx.locale", label: "ctx.locale", path: "ctx.locale" },
    ],
  },
  {
    id: "llm",
    label: "llm",
    blockID: "llm",
    children: [
      { id: "llm.output.text", label: "output.text", path: "output.text" },
      { id: "llm.output.tokens", label: "output.tokens", path: "output.tokens" },
    ],
  },
];

const runtimeModes: ParamSchemaRuntimeMode[] = ["define", "refine", "bind", "read"];
const activeEditorComponent = computed(() => ParamSchemaRegularEditor);
const activeState = computed(() => regularEditor.state.value);
const activeDispatch = computed(() => regularEditor.dispatch);
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Param Schema Editors</CardTitle>
      <CardDescription>
        Param Schema Editor 当前仅保留 Regular 入口，支持 define/refine/bind/read 运行态权限。
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="mode in runtimeModes"
          :key="mode"
          type="button"
          size="sm"
          :variant="runtimeMode === mode ? 'secondary' : 'outline'"
          @click="runtimeMode = mode"
        >
          {{ mode }}
        </Button>
      </div>

      <div class="rounded-md border bg-muted/30 p-3 text-xs leading-6">
        <p class="font-medium">检查点</p>
        <p>1. 切换 runtime mode 后，字段/结构编辑权限会按模式变化。</p>
        <p>2. 支持导入导出、undo/redo、节点结构编辑与详情联动。</p>
        <p>3. refine/bind 模式下值编辑器支持类型切换、引用变量和校验提示。</p>
      </div>

      <component
        :is="activeEditorComponent"
        :state="activeState"
        :dispatch="activeDispatch"
        :runtime-mode="runtimeMode"
        :role-options="roleOptions"
        :value-ref-tree="valueRefTree"
        class="h-[640px] min-h-0"
      />
    </CardContent>
  </Card>
</template>
