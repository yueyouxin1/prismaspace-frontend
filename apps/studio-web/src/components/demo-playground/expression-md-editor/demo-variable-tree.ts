import type { VariableTreeNode } from "@prismaspace/editor";

export const demoExpressionVariableTree: VariableTreeNode[] = [
  {
    key: "user",
    label: "用户",
    blockID: "user",
    schemaType: "object",
    selectable: false,
    children: [
      {
        key: "user.name",
        label: "name",
        path: "name",
        schemaType: "string",
      },
      {
        key: "user.email",
        label: "email",
        path: "email",
        schemaType: "string",
      },
      {
        key: "user.profile",
        label: "profile",
        path: "profile",
        schemaType: "object",
        selectable: false,
        children: [
          {
            key: "user.profile.locale",
            label: "locale",
            path: "profile.locale",
            schemaType: "string",
          },
        ],
      },
    ],
  },
  {
    key: "workflow",
    label: "工作流",
    blockID: "workflow",
    schemaType: "object",
    selectable: false,
    children: [
      {
        key: "workflow.id",
        label: "id",
        path: "id",
        schemaType: "string",
      },
      {
        key: "workflow.status",
        label: "status",
        path: "status",
        schemaType: "string",
      },
    ],
  },
  {
    key: "runtime",
    label: "运行时",
    blockID: "runtime",
    schemaType: "object",
    selectable: false,
    children: [
      {
        key: "runtime.locale",
        label: "locale",
        path: "locale",
        schemaType: "string",
      },
      {
        key: "runtime.timezone",
        label: "timezone",
        path: "timezone",
        schemaType: "string",
      },
    ],
  },
];


