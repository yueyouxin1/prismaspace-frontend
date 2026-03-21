<script setup lang="ts">
import { ref } from "vue"
import {
  MdEditor,
  MdEditorVariablePanel,
  type ExpressionSyntax,
  type MdEditorExpose,
  type MdExpressionRule,
} from "@prismaspace/editor"
import { Button } from "@prismaspace/ui-shadcn/components/ui/button"
import DemoPlaygroundPanel from "@app/components/demo-playground/DemoPlaygroundPanel.vue"
import { demoExpressionVariableTree } from "../demo-variable-tree"

const DEMO_CONTENT = `# Monaco Markdown Edit

输入 {{ 或 \${ 触发表达式弹窗。

- 表达式示例：{{user.name}}
- 继续输入过滤：{{user.}}

在此编辑器中，表达式支持：
1. 自定义弹窗选择并插入
2. 背景色高亮渲染（不改变原始文本）

当前高亮关键字：user、workflow、plugin。
`

const editorRef = ref<MdEditorExpose>()
const value = ref(DEMO_CONTENT)
const readonly = ref(false)
const popupEnabled = ref(true)
const expressionRenderEnabled = ref(true)
const lastEvent = ref("等待触发...")

const expressionSyntaxes: ExpressionSyntax[] = [
  {
    key: "mustache",
    open: "{{",
    close: "}}",
  },
  {
    key: "template-string",
    open: "${",
    close: "}",
  },
]

const expressionRules: MdExpressionRule[] = [
  {
    key: "user-token",
    match: /\buser\b/g,
    mode: "highlight",
    highlightStyle: {
      backgroundColor: "rgba(0, 120, 255, 0.18)",
      borderRadius: "4px",
    },
  },
  {
    key: "workflow-token",
    match: /\bworkflow\b/g,
    mode: "highlight",
    highlightStyle: {
      backgroundColor: "rgba(34, 197, 94, 0.2)",
      borderRadius: "4px",
    },
  },
  {
    key: "plugin-token",
    match: /\bplugin\b/g,
    mode: "highlight",
    highlightStyle: {
      backgroundColor: "rgba(249, 115, 22, 0.2)",
      borderRadius: "4px",
    },
  },
]

function toggleReadonly(): void {
  readonly.value = !readonly.value
}

function togglePopup(): void {
  popupEnabled.value = !popupEnabled.value
}

function toggleExpressionRenderer(): void {
  expressionRenderEnabled.value = !expressionRenderEnabled.value
}

function insertTemplate(): void {
  editorRef.value?.insertText("{{workflow.id}}")
}

function resetContent(): void {
  value.value = DEMO_CONTENT
  lastEvent.value = "已重置 Demo 内容"
}
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-background">
    <DemoPlaygroundPanel
      title="Monaco Expression Md Editor"
      description="Monaco Markdown 编辑器，支持表达式触发弹窗与背景色高亮。"
    >
      <div class="space-y-4">
        <section class="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" @click="resetContent">
            重置内容
          </Button>
          <Button type="button" variant="outline" size="sm" @click="insertTemplate">
            插入模板
          </Button>
          <Button type="button" variant="outline" size="sm" @click="toggleReadonly">
            Readonly: {{ readonly ? "ON" : "OFF" }}
          </Button>
          <Button type="button" variant="outline" size="sm" @click="togglePopup">
            Popup: {{ popupEnabled ? "ON" : "OFF" }}
          </Button>
          <Button type="button" variant="outline" size="sm" @click="toggleExpressionRenderer">
            Highlight: {{ expressionRenderEnabled ? "ON" : "OFF" }}
          </Button>
        </section>

        <section class="rounded-xl border bg-muted/20 p-3 text-xs leading-6">
          <p class="font-medium">检查点</p>
          <p>1. 输入 <code>{{ "{{" }}</code> 或 <code>{{ "${" }}</code> 时可打开变量弹窗并插入文本。</p>
          <p>2. 关键字高亮仅影响展示，不影响编辑与光标行为。</p>
        </section>

        <section class="rounded-xl border bg-muted/20 p-3 text-xs">
          <p class="mb-1 font-medium">Last Event</p>
          <p>{{ lastEvent }}</p>
        </section>
      </div>
    </DemoPlaygroundPanel>

    <div class="h-full w-full p-3 md:p-4">
      <MdEditor
        ref="editorRef"
        v-model="value"
        path="playground/monaco-expression-md-editor-demo"
        theme="vs-light"
        lineNumbers="off"
        :fontSize="15"
        :readonly="readonly"
        :popup-component="popupEnabled ? MdEditorVariablePanel : undefined"
        :popup-props="{ tree: demoExpressionVariableTree }"
        :expression-syntaxes="expressionSyntaxes"
        :expression-rules="expressionRenderEnabled ? expressionRules : []"
        height="100%"
        placeholder="输入 Markdown，使用 {{ 或 ${ 触发表达式弹窗"
        @popup-show="lastEvent = `popup-show: ${$event.triggerText}${$event.queryText}`"
        @popup-hide="lastEvent = 'popup-hide'"
        @popup-select="lastEvent = `popup-select: ${$event.insertText}`"
      />
    </div>
  </div>
</template>
