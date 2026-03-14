export type ParamSchemaRuntimeMode = "define" | "refine" | "bind" | "default" | "read";
export type SchemaEditorDensity = "compact" | "balanced" | "full";

export type SchemaEditableField =
  | "name"
  | "type"
  | "label"
  | "description"
  | "required"
  | "open"
  | "role"
  | "default"
  | "enum"
  | "meta"
  | "value";

export type ParamSchemaRegularDetailField =
  | "default"
  | "description"
  | "label"
  | "role"
  | "enum"
  | "meta"
  | "open"
  | "value"
  | "arrayItemType";

export interface ParamSchemaRegularInlineVisibility {
  name: boolean;
  type: boolean;
  required: boolean;
  valueField: "value" | "default" | null;
  actions: boolean;
}

export type ParamSchemaRegularDetailVisibility = Record<ParamSchemaRegularDetailField, boolean>;
export type ParamSchemaProfessionalDetailVisibility = Record<SchemaEditableField, boolean>;

export interface RuntimeColumnVisibility {
  name: boolean;
  type: boolean;
  default: boolean;
  required: boolean;
  open: boolean;
  actions: boolean;
}

export interface ParamSchemaModeFieldVisibilityOverrides {
  regularInline?: Partial<ParamSchemaRegularInlineVisibility>;
  regularDetail?: Partial<Record<ParamSchemaRegularDetailField, boolean>>;
  professionalDetail?: Partial<Record<SchemaEditableField, boolean>>;
  runtimeColumns?: Partial<RuntimeColumnVisibility>;
}

export type ParamSchemaFieldVisibilityOverrides = Partial<
  Record<ParamSchemaRuntimeMode, ParamSchemaModeFieldVisibilityOverrides>
>;

const DEFAULT_REGULAR_DETAIL_VISIBILITY: Record<
  ParamSchemaRuntimeMode,
  ParamSchemaRegularDetailVisibility
> = {
  define: {
    default: true,
    description: true,
    label: true,
    role: true,
    enum: true,
    meta: true,
    open: true,
    value: false,
    arrayItemType: true,
  },
  refine: {
    default: false,
    description: false,
    label: false,
    role: false,
    enum: false,
    meta: false,
    open: false,
    value: false,
    arrayItemType: false,
  },
  bind: {
    default: false,
    description: false,
    label: false,
    role: false,
    enum: false,
    meta: false,
    open: false,
    value: false,
    arrayItemType: false,
  },
  default: {
    default: true,
    description: false,
    label: false,
    role: false,
    enum: false,
    meta: false,
    open: false,
    value: false,
    arrayItemType: true,
  },
  read: {
    default: true,
    description: true,
    label: true,
    role: true,
    enum: false,
    meta: false,
    open: true,
    value: false,
    arrayItemType: true,
  },
};

const DEFAULT_PROFESSIONAL_DETAIL_VISIBILITY: Record<
  ParamSchemaRuntimeMode,
  ParamSchemaProfessionalDetailVisibility
> = {
  define: {
    name: true,
    type: true,
    label: true,
    description: true,
    required: true,
    open: true,
    role: true,
    default: true,
    enum: true,
    meta: true,
    value: true,
  },
  refine: {
    name: true,
    type: false,
    label: false,
    description: false,
    required: false,
    open: false,
    role: false,
    default: false,
    enum: false,
    meta: false,
    value: true,
  },
  bind: {
    name: false,
    type: false,
    label: false,
    description: false,
    required: false,
    open: false,
    role: false,
    default: false,
    enum: false,
    meta: false,
    value: true,
  },
  default: {
    name: true,
    type: true,
    label: false,
    description: false,
    required: false,
    open: false,
    role: false,
    default: true,
    enum: false,
    meta: false,
    value: false,
  },
  read: {
    name: true,
    type: true,
    label: true,
    description: true,
    required: true,
    open: true,
    role: true,
    default: true,
    enum: true,
    meta: true,
    value: true,
  },
};

function getModeVisibilityOverrides(
  mode: ParamSchemaRuntimeMode,
  fieldVisibility?: ParamSchemaFieldVisibilityOverrides,
) {
  return fieldVisibility?.[mode];
}

export function canMutateStructureInMode(mode: ParamSchemaRuntimeMode): boolean {
  return mode === "define" || mode === "refine";
}

export function canEditFieldInMode(mode: ParamSchemaRuntimeMode, field: SchemaEditableField): boolean {
  if (mode === "read") return false;

  if (mode === "define") return true;

  if (mode === "default") {
    return field === "default";
  }

  if (mode === "bind") {
    return field === "type" || field === "value";
  }

  if (mode === "refine") {
    return field === "name" || field === "type" || field === "value";
  }

  return false;
}

export function resolveRegularInlineVisibility(
  mode: ParamSchemaRuntimeMode,
  width: number,
  fieldVisibility?: ParamSchemaFieldVisibilityOverrides,
): ParamSchemaRegularInlineVisibility {
  const density = width < 360 ? "xs" : width < 520 ? "sm" : width < 760 ? "md" : "lg";

  const baseVisibility: ParamSchemaRegularInlineVisibility =
    mode === "read"
      ? {
          name: false,
          type: true,
          required: false,
          valueField: null,
          actions: false,
        }
      : mode === "bind"
        ? {
            name: false,
            type: false,
            required: false,
            valueField: "value",
            actions: true,
          }
        : mode === "refine"
          ? {
              name: true,
              type: false,
              required: false,
              valueField: "value",
              actions: true,
            }
          : mode === "default"
            ? {
                name: false,
                type: false,
                required: false,
                valueField: "default",
                actions: true,
              }
            : {
                name: true,
                type: true,
                required: true,
                valueField: density === "lg" ? "default" : null,
                actions: true,
              };

  return {
    ...baseVisibility,
    ...getModeVisibilityOverrides(mode, fieldVisibility)?.regularInline,
  };
}

export function resolveRegularDetailVisibility(
  mode: ParamSchemaRuntimeMode,
  fieldVisibility?: ParamSchemaFieldVisibilityOverrides,
): ParamSchemaRegularDetailVisibility {
  return {
    ...DEFAULT_REGULAR_DETAIL_VISIBILITY[mode],
    ...getModeVisibilityOverrides(mode, fieldVisibility)?.regularDetail,
  };
}

export function resolveProfessionalDetailVisibility(
  mode: ParamSchemaRuntimeMode,
  fieldVisibility?: ParamSchemaFieldVisibilityOverrides,
): ParamSchemaProfessionalDetailVisibility {
  return {
    ...DEFAULT_PROFESSIONAL_DETAIL_VISIBILITY[mode],
    ...getModeVisibilityOverrides(mode, fieldVisibility)?.professionalDetail,
  };
}

export function resolveRuntimeColumns(
  mode: ParamSchemaRuntimeMode,
  density: SchemaEditorDensity,
  fieldVisibility?: ParamSchemaFieldVisibilityOverrides,
): RuntimeColumnVisibility {
  let columns: RuntimeColumnVisibility;

  if (mode === "refine") {
    columns = {
      name: true,
      type: false,
      default: false,
      required: false,
      open: false,
      actions: true,
    };
  } else if (mode === "bind") {
    columns = {
      name: true,
      type: density !== "compact",
      default: false,
      required: false,
      open: false,
      actions: true,
    };
  } else if (mode === "default") {
    columns = {
      name: true,
      type: density !== "compact",
      default: true,
      required: false,
      open: false,
      actions: true,
    };
  } else if (mode === "read") {
    columns = {
      name: true,
      type: true,
      default: density !== "compact",
      required: false,
      open: false,
      actions: false,
    };
  } else if (density === "compact") {
    columns = {
      name: true,
      type: true,
      default: false,
      required: false,
      open: false,
      actions: true,
    };
  } else if (density === "balanced") {
    columns = {
      name: true,
      type: true,
      default: true,
      required: false,
      open: false,
      actions: true,
    };
  } else {
    columns = {
      name: true,
      type: true,
      default: true,
      required: true,
      open: true,
      actions: true,
    };
  }

  return {
    ...columns,
    ...getModeVisibilityOverrides(mode, fieldVisibility)?.runtimeColumns,
  };
}
