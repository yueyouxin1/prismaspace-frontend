<script setup lang="ts">
import { computed, ref } from "vue"
import {
  ParamSchemaRegularEditor,
  type ParamSchemaRuntimeMode,
  useParamSchemaEditor,
} from "@prismaspace/editor"
import { Button } from "@prismaspace/ui-shadcn/components/ui/button"
import DemoPlaygroundPanel from "@app/components/demo-playground/DemoPlaygroundPanel.vue"
import ParamSchemaCascadeValueRefPickerDemo from "./ParamSchemaCascadeValueRefPickerDemo.vue"
import { demoParamSchemaRoleOptions, demoParamSchemaValueRefTree } from "./demo-data"

const runtimeMode = ref<ParamSchemaRuntimeMode>("define")
const pickerVariant = ref<"default" | "cascade">("default")

const regularEditor = useParamSchemaEditor()

const runtimeModes: ParamSchemaRuntimeMode[] = ["define", "refine", "bind", "read"]
const activeEditorComponent = computed(() => ParamSchemaRegularEditor)
const activeState = computed(() => regularEditor.state.value)
const activeDispatch = computed(() => regularEditor.dispatch)
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-background">
    <DemoPlaygroundPanel
      title="Param Schema Editor"
      description="Regular 入口支持 define/refine/bind/read 运行态权限，以及默认 / 自定义变量面板切换。"
    >
      <div class="space-y-4">
        <section class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            变量面板
          </p>
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
        </section>

        <section class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Runtime Mode
          </p>
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
        </section>

        <section class="rounded-xl border bg-muted/20 p-3 text-xs leading-6">
          <p class="font-medium">检查点</p>
          <p>1. 切换 runtime mode 后，字段/结构编辑权限会按模式变化。</p>
          <p>2. 支持导入导出、undo/redo、节点结构编辑与详情联动。</p>
          <p>3. refine/bind 模式下值编辑器支持默认 tree 面板与自定义级联变量面板切换。</p>
          <p>4. 自定义面板与默认面板共用同一套 reject-incompatible 引用规则和动态校验。</p>
        </section>
      </div>
    </DemoPlaygroundPanel>

    <div class="h-full p-3 md:p-4">
      <component
        :is="activeEditorComponent"
        :state="activeState"
        :dispatch="activeDispatch"
        :runtime-mode="runtimeMode"
        :role-options="demoParamSchemaRoleOptions"
        :value-ref-tree="demoParamSchemaValueRefTree"
        class="h-full min-h-0"
      >
        <template v-if="pickerVariant === 'cascade'" #value-ref-picker="{ picker, close }">
          <ParamSchemaCascadeValueRefPickerDemo :picker="picker" :close="close" />
        </template>
      </component>
    </div>
  </div>
</template>
