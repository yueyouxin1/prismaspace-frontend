import type { FieldRendererDefinition, FieldRendererDescriptor } from "../types";
import ParamSchemaEditorField from "./ParamSchemaEditorField.vue";

export const paramSchemaEditorFieldRenderer: FieldRendererDefinition = {
  component: ParamSchemaEditorField,
  getProps: (ctx) => {
    return ctx.resolveDynamic(ctx.item.props ?? {});
  },
  transformInput: (value) => {
    return Array.isArray(value) ? value : [];
  },
  transformOutput: (value) => {
    return Array.isArray(value) ? value : [];
  },
};

export const paramSchemaEditorFieldDescriptor: FieldRendererDescriptor = {
  name: "param-schema-editor",
  title: "Param Schema Editor",
  description: "Advanced schema editor field integrating ParamSchemaRegularEditor with optional injected valueRefTree and parent action teleport.",
  category: "advanced",
  kind: "field",
  valueShape: "array",
  tags: ["schema", "editor", "advanced"],
  renderer: paramSchemaEditorFieldRenderer,
};
