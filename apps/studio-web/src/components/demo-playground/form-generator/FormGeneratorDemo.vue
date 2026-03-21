<script setup lang="ts">
import { computed, onMounted, provide, ref } from "vue"
import { Badge } from "@prismaspace/ui-shadcn/components/ui/badge"
import { Button } from "@prismaspace/ui-shadcn/components/ui/button"
import {
  FormGenerator,
  type FormComponentCatalog,
  type FormGeneratorExposed,
  type FormItem,
} from "@prismaspace/generator/form-generator"
import {
  formGeneratorValueRefTreeKey,
  paramSchemaEditorFieldDescriptor,
} from "@prismaspace/generator/form-generator/advanced-components"
import DemoPlaygroundPanel from "@app/components/demo-playground/DemoPlaygroundPanel.vue"
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
  timezoneOptions: DemoOption[]
  onDebug: (payload: unknown) => void
}

const formGeneratorRef = ref<FormGeneratorExposed>()
const formModel = ref<Record<string, unknown>>({
  account: {
    email: "",
    password: "",
  },
  user: {
    profile: {
      name: "",
      bio: "",
      city: "",
      country: "",
      birthDate: "",
      reminderAt: "",
      contactTime: "",
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
    teamSize: 6,
    score: 10,
    intensity: 40,
  },
  security: {
    otp: "",
    retryLimit: 3,
    policyNote: "",
    backupContactTime: "",
  },
  preferences: {
    deliveryChannel: "email",
    responseFormat: "summary",
    timezone: "Asia/Shanghai",
  },
  ui: {
    activeSchemaSections: ["response-schema", "metadata-schema"],
    activePreferenceTab: "delivery",
  },
  schemas: {
    output: createDemoOutputSchemaSeed(),
    response: createDemoOutputSchemaSeed(),
    metadata: createDemoMetadataSchemaSeed(),
  },
})

const logs = ref<string[]>([])
const componentCatalog = ref<FormComponentCatalog>({
  fields: [],
  actions: [],
})

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
  timezoneOptions: [
    { label: "Asia/Shanghai", value: "Asia/Shanghai" },
    { label: "UTC", value: "UTC" },
    { label: "America/New_York", value: "America/New_York" },
  ],
  onDebug: (payload: unknown) => {
    logs.value.unshift(`[callback] ${JSON.stringify(payload)}`)
  },
})

provide(formGeneratorValueRefTreeKey, demoParamSchemaValueRefTree)

function collectControls(items: FormItem[]): { fields: string[], actions: string[] } {
  const fields = new Set<string>()
  const actions = new Set<string>()

  const walk = (nodes: FormItem[]) => {
    for (const item of nodes) {
      if (item.type === "action") {
        actions.add(item.actionType)
        continue
      }

      fields.add(item.control)
      if (item.children?.length) {
        walk(item.children)
      }
    }
  }

  walk(items)

  return {
    fields: [...fields].sort(),
    actions: [...actions].sort(),
  }
}

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
    id: "email",
    type: "form",
    control: "email",
    label: "邮箱",
    modelPath: "account.email",
    props: {
      placeholder: "name@example.com",
    },
    required: true,
  },
  {
    id: "password",
    type: "form",
    control: "password",
    label: "密码",
    modelPath: "account.password",
    props: {
      placeholder: "请输入密码",
    },
    required: true,
  },
  {
    id: "bio",
    type: "form",
    control: "textarea",
    label: "个人简介",
    modelPath: "user.profile.bio",
    props: {
      placeholder: "介绍你的工作流与使用偏好",
      rows: 4,
    },
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
    id: "birthDate",
    type: "form",
    control: "date",
    label: "生日",
    modelPath: "user.profile.birthDate",
  },
  {
    id: "reminderAt",
    type: "form",
    control: "datetime",
    label: "提醒时间",
    modelPath: "user.profile.reminderAt",
  },
  {
    id: "contactTime",
    type: "form",
    control: "time",
    label: "联系时段",
    modelPath: "user.profile.contactTime",
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
    id: "teamSize",
    type: "form",
    control: "number",
    label: "团队人数",
    modelPath: "metrics.teamSize",
    props: {
      min: 1,
      max: 200,
      step: 1,
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
    modelPath: "ui.activeSchemaSections",
    props: {
      type: "multiple",
      collapsible: true,
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
    id: "verificationTabsRoot",
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
        id: "verificationPolicyTab",
        type: "layout",
        control: "tabs-item",
        props: {
          value: "policy",
          title: "验证策略",
        },
        children: [
          {
            id: "policyNote",
            type: "form",
            control: "textarea",
            label: "策略说明",
            modelPath: "security.policyNote",
            props: {
              placeholder: "记录验证码策略和风险控制说明",
              rows: 3,
            },
          },
          {
            id: "backupContactTime",
            type: "form",
            control: "time",
            label: "备用联系时段",
            modelPath: "security.backupContactTime",
          },
        ],
      },
    ],
  },
  {
    id: "preferenceTabsRoot",
    type: "layout",
    control: "tabs",
    modelPath: "ui.activePreferenceTab",
    children: [
      {
        id: "deliveryPreferenceTab",
        type: "layout",
        control: "tabs-item",
        props: {
          value: "delivery",
          title: "交付渠道",
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
      {
        id: "timezonePreferenceTab",
        type: "layout",
        control: "tabs-item",
        props: {
          value: "timezone",
          title: "时区与表达",
        },
        children: [
          {
            id: "timezone",
            type: "form",
            control: "native-select",
            label: "时区",
            modelPath: "preferences.timezone",
            props: {
              placeholder: "请选择时区",
              options: "{{ ctx.timezoneOptions }}",
            },
          },
          {
            id: "deliverySummary",
            type: "form",
            control: "textarea",
            label: "交付说明",
            modelPath: "user.profile.bio",
            props: {
              placeholder: "这里复用 textarea，验证 tabs 受控场景下的嵌套字段",
              rows: 3,
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

const usedControls = computed(() => collectControls(schema.value))
const missingFieldControls = computed(() => {
  const registered = new Set(componentCatalog.value.fields.map((item) => item.name))
  return usedControls.value.fields.filter((name) => !registered.has(name))
})
const missingActionControls = computed(() => {
  const registered = new Set(componentCatalog.value.actions.map((item) => item.name))
  return usedControls.value.actions.filter((name) => !registered.has(name))
})
const unusedRegisteredFields = computed(() => {
  const used = new Set(usedControls.value.fields)
  return componentCatalog.value.fields
    .map((item) => item.name)
    .filter((name) => !used.has(name))
})

function refreshComponentCatalog(): void {
  componentCatalog.value = formGeneratorRef.value?.getComponentCatalog() ?? {
    fields: [],
    actions: [],
  }
}

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
  refreshComponentCatalog()
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
  <div class="relative h-full w-full overflow-hidden bg-background">
    <DemoPlaygroundPanel
      title="Form Generator"
      description="覆盖默认字段、layout 组件、button action、高级 param-schema-editor，以及 layout 状态与 model 映射用例。"
    >
      <div class="space-y-4">
        <Button type="button" size="sm" variant="outline" @click="toggleAdvanced">
          切换高级模式（当前：{{ context.showAdvanced ? "ON" : "OFF" }}）
        </Button>

        <section class="space-y-2 rounded-xl border bg-muted/20 p-3 text-xs">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium">Field 覆盖</span>
            <Badge variant="secondary">{{ usedControls.fields.length }} / {{ componentCatalog.fields.length }}</Badge>
            <Badge v-if="missingFieldControls.length === 0" variant="secondary">无缺失</Badge>
            <Badge v-else variant="destructive">缺失 {{ missingFieldControls.length }}</Badge>
          </div>
          <p class="text-muted-foreground">
            已用字段：{{ usedControls.fields.join(", ") }}
          </p>
          <p v-if="missingFieldControls.length" class="text-destructive">
            缺失字段：{{ missingFieldControls.join(", ") }}
          </p>
          <p v-else class="text-muted-foreground">
            未覆盖注册字段：{{ unusedRegisteredFields.length ? unusedRegisteredFields.join(", ") : "无" }}
          </p>
          <p class="text-muted-foreground">
            Action 覆盖：{{ usedControls.actions.join(", ") || "无" }}
          </p>
          <p v-if="missingActionControls.length" class="text-destructive">
            缺失 Action：{{ missingActionControls.join(", ") }}
          </p>
        </section>

        <section class="rounded-xl border bg-muted/20 p-3 text-xs">
          <p class="mb-2 font-medium">Current Form Model</p>
          <pre class="max-h-48 overflow-auto whitespace-pre-wrap">{{ prettyModel }}</pre>
        </section>

        <section class="rounded-xl border bg-muted/20 p-3 text-xs">
          <p class="mb-2 font-medium">Event Logs</p>
          <ul class="space-y-2">
            <li v-for="(item, index) in logs" :key="index" class="rounded-md bg-background px-2 py-2">
              {{ item }}
            </li>
            <li v-if="logs.length === 0" class="text-muted-foreground">
              暂无事件
            </li>
          </ul>
        </section>
      </div>
    </DemoPlaygroundPanel>

    <div class="h-full overflow-auto p-4 md:p-6">
      <div class="mx-auto max-w-6xl">
        <FormGenerator
          ref="formGeneratorRef"
          v-model="formModel"
          :schema="schema"
          :context="context"
          @submit="handleSubmit"
        />
      </div>
    </div>
  </div>
</template>
