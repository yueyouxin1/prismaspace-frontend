<script setup lang="ts">
import { computed, onMounted, provide, ref } from "vue"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@prismaspace/ui-shadcn/components/ui/card"
import { Button } from "@prismaspace/ui-shadcn/components/ui/button"
import { FormGenerator, type FormGeneratorExposed, type FormItem } from "@prismaspace/generator/form-generator"
import {
  paramSchemaEditorFieldDescriptor,
  formGeneratorValueRefTreeKey,
} from "@prismaspace/generator/form-generator/advanced-components"
import CounterField from "./CounterField.vue"
import {
  createDemoMetadataSchemaSeed,
  createDemoOutputSchemaSeed,
  demoParamSchemaRoleOptions,
  demoParamSchemaValueRefTree,
} from "../param-schema-editor/demo-data"

type DemoOption = {
  label: string
  value: string
}

type DemoContext = {
  showAdvanced: boolean
  cityOptions: DemoOption[]
  countryOptions: DemoOption[]
  onDebug: (payload: unknown) => void
}

const formGeneratorRef = ref<FormGeneratorExposed>()
const formModel = ref<Record<string, unknown>>({
  user: {
    profile: {
      name: "",
      city: "",
      country: "",
      travelWindow: {
        start: "",
        end: "",
      },
      skills: ["Vue"],
      hobbies: [],
    },
  },
  flags: {
    vip: false,
    newsletter: false,
  },
  metrics: {
    score: 10,
    intensity: 40,
  },
  security: {
    otp: "",
    retryLimit: 3,
  },
  preferences: {
    deliveryChannel: "email",
    responseFormat: "summary",
  },
  schemas: {
    output: createDemoOutputSchemaSeed(),
    response: createDemoOutputSchemaSeed(),
    metadata: createDemoMetadataSchemaSeed(),
  },
})

const logs = ref<string[]>([])

const context = ref<DemoContext>({
  showAdvanced: false,
  cityOptions: [
    { label: "Beijing", value: "Beijing" },
    { label: "Shanghai", value: "Shanghai" },
    { label: "Shenzhen", value: "Shenzhen" },
  ],
  countryOptions: [
    { label: "China", value: "CN" },
    { label: "United States", value: "US" },
    { label: "Japan", value: "JP" },
  ],
  onDebug: (payload: unknown) => {
    logs.value.unshift(`[callback] ${JSON.stringify(payload)}`)
  },
})

provide(formGeneratorValueRefTreeKey, demoParamSchemaValueRefTree)

const schema = computed(() => ([
  {
    id: "name",
    type: "form",
    control: "input",
    label: "姓名",
    modelPath: "user.profile.name",
    props: {
      placeholder: "请输入姓名",
      defaultValue: "{{ ctx.showAdvanced ? '高级用户' : '' }}",
    },
    required: true,
  },
  {
    id: "city",
    type: "form",
    control: "combobox",
    label: "城市",
    modelPath: "user.profile.city",
    props: {
      placeholder: "选择城市",
      options: "{{ ctx.cityOptions }}",
    },
  },
  {
    id: "country",
    type: "form",
    control: "select",
    label: "国家",
    modelPath: "user.profile.country",
    props: {
      placeholder: "请选择国家",
      options: "{{ ctx.countryOptions }}",
    },
  },
  {
    id: "vip",
    type: "form",
    control: "switch",
    label: "VIP 模式",
    modelPath: "flags.vip",
    props: {
      label: "启用 VIP",
    },
  },
  {
    id: "newsletter",
    type: "form",
    control: "checkbox",
    label: "订阅",
    modelPath: "flags.newsletter",
    props: {
      label: "订阅邮件通知",
    },
    state: {
      visible: "{{ model.user.profile.country === 'CN' || model.flags.vip }}",
    },
  },
  {
    id: "travelWindow",
    type: "form",
    control: "date-range",
    label: "出行日期",
    modelPath: "user.profile.travelWindow",
    state: {
      disabled: "{{ !model.flags.vip }}",
    },
  },
  {
    id: "skills",
    type: "form",
    control: "tags-input",
    label: "技能标签",
    modelPath: "user.profile.skills",
    props: {
      placeholder: "输入后回车",
    },
  },
  {
    id: "hobbies",
    type: "form",
    control: "checkbox-group",
    label: "兴趣偏好",
    modelPath: "user.profile.hobbies",
    state: {
      visible: "{{ ctx.showAdvanced || model.flags.vip }}",
    },
    props: {
      options: [
        { label: "Coding", value: "coding" },
        { label: "Music", value: "music" },
        { label: "Travel", value: "travel" },
      ],
    },
  },
  {
    id: "intensity",
    type: "form",
    control: "slider",
    label: "强度",
    modelPath: "metrics.intensity",
    props: {
      min: 0,
      max: 100,
      step: 5,
    },
  },
  {
    id: "customCounter",
    type: "form",
    control: "counter",
    label: "自定义计数器（注册组件）",
    modelPath: "metrics.score",
    props: {
      min: 0,
      max: 50,
      step: 2,
    },
  },
  {
    id: "outputSchemaAccordion",
    type: "layout",
    control: "accordion",
    props: {
      title: "复杂表单容器：Accordion + Param Schema Editor",
      description: "父容器只暴露 header portal，子编辑器通过 inject + teleport 接管头部 actions。",
      defaultOpen: true,
      itemValue: "output-schema",
    },
    children: [
      {
        id: "outputSchemaEditor",
        type: "form",
        control: "param-schema-editor",
        modelPath: "schemas.output",
        props: {
          runtimeMode: "refine",
          roleOptions: demoParamSchemaRoleOptions,
          headerTitle: "OUTPUT SCHEMA",
          class: "h-[560px] min-h-0",
        },
      },
    ],
  },
  {
    id: "schemaSectionsRoot",
    type: "layout",
    control: "accordion-root",
    props: {
      type: "multiple",
      collapsible: true,
      defaultValue: ["response-schema", "metadata-schema"],
    },
    children: [
      {
        id: "responseSchemaItem",
        type: "layout",
        control: "accordion-item",
        props: {
          value: "response-schema",
          title: "响应 Schema（accordion-root + accordion-item）",
          description: "item 自己提供 header portal，子 Param Schema Editor 自动注入操作区。",
        },
        children: [
          {
            id: "responseSchemaEditor",
            type: "form",
            control: "param-schema-editor",
            modelPath: "schemas.response",
            props: {
              runtimeMode: "bind",
              roleOptions: demoParamSchemaRoleOptions,
              headerTitle: "RESPONSE SCHEMA",
              class: "h-[520px] min-h-0",
            },
          },
        ],
      },
      {
        id: "metadataSchemaItem",
        type: "layout",
        control: "accordion-item",
        props: {
          value: "metadata-schema",
          title: "元数据 Schema",
          description: "第二个 item 复用同一套通用注册组件，不依赖父子硬编码。",
        },
        children: [
          {
            id: "metadataSchemaEditor",
            type: "form",
            control: "param-schema-editor",
            modelPath: "schemas.metadata",
            props: {
              runtimeMode: "bind",
              roleOptions: demoParamSchemaRoleOptions,
              headerTitle: "METADATA SCHEMA",
              class: "h-[480px] min-h-0",
            },
          },
        ],
      },
    ],
  },
  {
    id: "settingsTabsRoot",
    type: "layout",
    control: "tabs",
    props: {
      defaultValue: "verification",
    },
    children: [
      {
        id: "verificationTab",
        type: "layout",
        control: "tabs-item",
        props: {
          value: "verification",
          title: "验证码与重试",
        },
        children: [
          {
            id: "otp",
            type: "form",
            control: "input-otp",
            label: "验证码",
            modelPath: "security.otp",
            props: {
              maxlength: 6,
              separatorIndex: 3,
            },
            required: true,
          },
          {
            id: "retryLimit",
            type: "form",
            control: "number-field",
            label: "重试上限",
            modelPath: "security.retryLimit",
            props: {
              min: 1,
              max: 10,
              step: 1,
            },
          },
        ],
      },
      {
        id: "deliveryTab",
        type: "layout",
        control: "tabs-item",
        props: {
          value: "delivery",
          title: "交付偏好",
        },
        children: [
          {
            id: "deliveryChannel",
            type: "form",
            control: "native-select",
            label: "交付渠道",
            modelPath: "preferences.deliveryChannel",
            props: {
              placeholder: "请选择交付渠道",
              options: [
                { label: "Email", value: "email" },
                { label: "Webhook", value: "webhook" },
                { label: "Slack", value: "slack" },
              ],
            },
            rules: [
              {
                message: "请选择交付渠道",
                validate: "{{ !!value }}",
              },
            ],
          },
          {
            id: "responseFormat",
            type: "form",
            control: "radio-group",
            label: "输出形式",
            modelPath: "preferences.responseFormat",
            props: {
              options: [
                { label: "摘要", value: "summary" },
                { label: "全文", value: "full" },
                { label: "结构化", value: "structured" },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: "submitAction",
    type: "action",
    actionType: "button",
    label: "提交",
    on: {
      kind: "emit",
      event: "submit",
      payload: "{{ model }}",
    },
  },
  {
    id: "debugAction",
    type: "action",
    actionType: "button",
    label: "调试回调",
    on: {
      kind: "callback",
      fn: "onDebug",
      payload: "{{ { name: model.user.profile.name, vip: model.flags.vip } }}",
    },
  },
] satisfies FormItem[]))

onMounted(() => {
  formGeneratorRef.value?.registerField({
    name: "counter",
    title: "Counter Field",
    description: "Custom demo counter using buttons plus numeric input.",
    category: "number",
    kind: "field",
    valueShape: "number",
    tags: ["counter", "custom", "number"],
    renderer: {
      component: CounterField,
      getProps: (ctx) => {
        const resolved = ctx.resolveDynamic(ctx.item.props ?? {})
        return {
          min: Number(resolved.min ?? 0),
          max: Number(resolved.max ?? 100),
          step: Number(resolved.step ?? 1),
        }
      },
      transformInput: (value) => Number(value ?? 0),
      transformOutput: (value) => Number(value ?? 0),
    },
  })
  formGeneratorRef.value?.registerField(paramSchemaEditorFieldDescriptor)
})

const prettyModel = computed(() => JSON.stringify(formModel.value, null, 2))

function handleSubmit(payload: unknown): void {
  logs.value.unshift(`[submit] ${JSON.stringify(payload)}`)
}

function toggleAdvanced(): void {
  context.value.showAdvanced = !Boolean(context.value.showAdvanced)
}
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Schema-Driven Form Generator Demo</CardTitle>
        <CardDescription>
          覆盖深层 modelPath、context 表达式联动、条件显示，以及单 item / 多 item 两种 Accordion 组合下的 Param Schema Editor 注册用例。
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <Button type="button" variant="outline" @click="toggleAdvanced">
            切换高级模式（当前：{{ context.showAdvanced ? "ON" : "OFF" }}）
          </Button>
        </div>

        <FormGenerator
          ref="formGeneratorRef"
          v-model="formModel"
          :schema="schema"
          :context="context"
          @submit="handleSubmit"
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Current Form Model</CardTitle>
      </CardHeader>
      <CardContent>
        <pre class="overflow-auto rounded-md bg-muted p-4 text-xs">{{ prettyModel }}</pre>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Event Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <ul class="space-y-2 text-xs">
          <li v-for="(item, index) in logs" :key="index" class="rounded-md bg-muted p-2">
            {{ item }}
          </li>
          <li v-if="logs.length === 0" class="text-muted-foreground">
            暂无事件
          </li>
        </ul>
      </CardContent>
    </Card>
  </div>
</template>
