import type { FieldRendererDefinition } from "../types";
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
