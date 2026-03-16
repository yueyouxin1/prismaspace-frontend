import type { ParameterSchema, VariableTreeNode } from "@prismaspace/editor";

export const demoParamSchemaRoleOptions = ["system", "input", "output"];

export const demoParamSchemaValueRefTree: VariableTreeNode[] = [
  {
    id: "user-vars",
    key: "user-vars",
    label: "用户变量",
    selectable: false,
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
    selectable: false,
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
    selectable: false,
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

export function createDemoOutputSchemaSeed(): ParameterSchema[] {
  return [
    {
      name: "answer",
      type: "string",
      required: true,
      open: true,
      role: "output",
      label: "回答正文",
    },
    {
      name: "confidence",
      type: "number",
      required: false,
      open: true,
      role: "output",
      label: "置信度",
      default: 0.82,
    },
    {
      name: "citations",
      type: "array",
      required: false,
      open: true,
      role: "output",
      label: "引用片段",
      items: {
        type: "object",
        properties: [
          {
            name: "title",
            type: "string",
            required: true,
            open: true,
            role: "output",
          },
          {
            name: "url",
            type: "string",
            required: false,
            open: true,
            role: "output",
          },
          {
            name: "score",
            type: "number",
            required: false,
            open: true,
            role: "output",
            default: 1,
          },
        ],
      },
    },
  ];
}

export function createDemoMetadataSchemaSeed(): ParameterSchema[] {
  return [
    {
      name: "requestId",
      type: "string",
      required: true,
      open: true,
      role: "output",
      label: "请求 ID",
    },
    {
      name: "latencyMs",
      type: "integer",
      required: false,
      open: true,
      role: "output",
      label: "耗时",
      default: 120,
    },
    {
      name: "source",
      type: "object",
      required: false,
      open: true,
      role: "output",
      label: "来源信息",
      properties: [
        {
          name: "provider",
          type: "string",
          required: true,
          open: true,
          role: "output",
        },
        {
          name: "region",
          type: "string",
          required: false,
          open: true,
          role: "output",
        },
      ],
    },
  ];
}
