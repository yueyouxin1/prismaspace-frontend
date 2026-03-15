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
import ParamSchemaCascadeValueRefPickerDemo from "./ParamSchemaCascadeValueRefPickerDemo.vue";

const runtimeMode = ref<ParamSchemaRuntimeMode>("define");
const pickerVariant = ref<"default" | "cascade">("default");

const regularEditor = useParamSchemaEditor();

const roleOptions = ["system", "input", "output"];

const valueRefTree: VariableTreeNode[] = [
  {
    id: "user-vars",
    key: "user-vars",
    label: "用户变量",
    children: [
      {
        id: "start",
        key: "start",
        label: "开始",
        blockID: "start",
        schemaType: "object",
        children: [
          {
            id: "start.param1",
            key: "start.param1",
            label: "param1",
            path: "param1",
            schemaType: "object",
            children: [
              {
                id: "start.param1.param2",
                key: "start.param1.param2",
                label: "param2",
                path: "param1.param2",
                schemaType: "array",
                children: [
                  {
                    id: "start.param1.param2.param3",
                    key: "start.param1.param2.param3",
                    label: "param3",
                    path: "param1.param2.param3",
                    schemaType: "string",
                  },
                ],
              },
            ],
          },
          { id: "start.user.id", key: "start.user.id", label: "user.id", path: "user.id", schemaType: "string" },
          { id: "start.user.name", key: "start.user.name", label: "user.name", path: "user.name", schemaType: "string" },
          { id: "start.user.locale", key: "start.user.locale", label: "user.locale", path: "user.locale", schemaType: "string" },
        ],
      },
      {
        id: "user-profile",
        key: "user-profile",
        label: "用户画像",
        blockID: "user-profile",
        schemaType: "object",
        children: [
          { id: "user-profile.plan", key: "user-profile.plan", label: "plan", path: "plan", schemaType: "string" },
          { id: "user-profile.score", key: "user-profile.score", label: "score", path: "score", schemaType: "number" },
        ],
      },
    ],
  },
  {
    id: "app-vars",
    key: "app-vars",
    label: "应用变量",
    children: [
      {
        id: "app-config",
        key: "app-config",
        label: "应用配置",
        blockID: "app-config",
        schemaType: "object",
        children: [
          { id: "app-config.region", key: "app-config.region", label: "region", path: "region", schemaType: "string" },
          { id: "app-config.flags", key: "app-config.flags", label: "flags", path: "flags", schemaType: "object" },
        ],
      },
      {
        id: "session-state",
        key: "session-state",
        label: "会话状态",
        blockID: "session-state",
        schemaType: "object",
        children: [
          { id: "session-state.messages", key: "session-state.messages", label: "messages", path: "messages", schemaType: "array" },
          { id: "session-state.summary", key: "session-state.summary", label: "summary", path: "summary", schemaType: "string" },
        ],
      },
    ],
  },
  {
    id: "system-vars",
    key: "system-vars",
    label: "系统变量",
    children: [
      {
        id: "llm",
        key: "llm",
        label: "大模型",
        blockID: "llm",
        schemaType: "object",
        children: [
          { id: "llm.output.text", key: "llm.output.text", label: "output.text", path: "output.text", schemaType: "string" },
          { id: "llm.output.tokens", key: "llm.output.tokens", label: "output.tokens", path: "output.tokens", schemaType: "integer" },
          { id: "llm.finishReason", key: "llm.finishReason", label: "finishReason", path: "finishReason", schemaType: "string" },
        ],
      },
      {
        id: "system-clock",
        key: "system-clock",
        label: "系统时钟",
        blockID: "system-clock",
        schemaType: "object",
        children: [
          { id: "system-clock.now", key: "system-clock.now", label: "now", path: "now", schemaType: "string" },
          { id: "system-clock.timezone", key: "system-clock.timezone", label: "timezone", path: "timezone", schemaType: "string" },
        ],
      },
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
        Param Schema Editor 当前仅保留 Regular 入口，支持 define/refine/bind/read 运行态权限，以及默认 / 自定义变量面板切换。
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          :variant="pickerVariant === 'default' ? 'secondary' : 'outline'"
          @click="pickerVariant = 'default'"
        >
          默认变量面板
        </Button>
        <Button
          type="button"
          size="sm"
          :variant="pickerVariant === 'cascade' ? 'secondary' : 'outline'"
          @click="pickerVariant = 'cascade'"
        >
          自定义级联面板
        </Button>
      </div>

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
        <p>3. refine/bind 模式下值编辑器支持默认 tree 面板与自定义级联变量面板切换。</p>
        <p>4. 自定义面板与默认面板共用同一套 reject-incompatible 引用规则和动态校验。</p>
      </div>

      <component
        :is="activeEditorComponent"
        :state="activeState"
        :dispatch="activeDispatch"
        :runtime-mode="runtimeMode"
        :role-options="roleOptions"
        :value-ref-tree="valueRefTree"
        class="h-[640px] min-h-0"
      >
        <template v-if="pickerVariant === 'cascade'" #value-ref-picker="{ picker, close }">
          <ParamSchemaCascadeValueRefPickerDemo :picker="picker" :close="close" />
        </template>
      </component>
    </CardContent>
  </Card>
</template>
