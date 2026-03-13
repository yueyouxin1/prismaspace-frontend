import { z } from "zod";

const nullOptional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === null ? undefined : value), schema.optional());

/** 你们的路径格式：这里先做“非空字符串”约束；如需更严可扩展正则 */
export const ModelPathSchema = z
  .string()
  .trim()
  .min(1, "modelPath 不能为空");

export type ModelPath = z.infer<typeof ModelPathSchema>;

/**
 * 表达式字符串规范：
 * - 普通字符串：不允许作为 Expr（避免误把 label 等当表达式）
 * - 表达式必须包裹：{{ ... }}
 * - 也允许直接传 boolean / number / object 等静态值
 */
export const ExprStringSchema = z
  .string()
  .trim()
  .regex(/^\{\{[\s\S]*\}\}$/, "表达式字符串必须使用 {{ ... }} 包裹");

export const ExprSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.union([valueSchema, ExprStringSchema]);

/** state: visible/disabled，带默认值 */
export const StateWhenSchema = z
  .object({
    visible: nullOptional(ExprSchema(z.boolean())),
    disabled: nullOptional(ExprSchema(z.boolean())),
  })
  .default({}) // 先给空对象
  .transform((s) => ({
    visible: s.visible ?? true,
    disabled: s.disabled ?? false,
  }));

/** ui 提示（可选） */
export const UIHintsSchema = nullOptional(
  z.object({
    className: nullOptional(z.string()),
    style: nullOptional(z.record(z.string(), z.union([z.string(), z.number()]))),
    width: nullOptional(z.union([z.number(), z.string()])),
    span: nullOptional(z.number().int().positive()),
    order: nullOptional(z.number().int()),
  }),
);

/** FieldRule */
export const FieldRuleSchema = z.object({
  name: nullOptional(z.string()),
  message: nullOptional(z.string()),
  when: nullOptional(ExprSchema(z.boolean())),
  // validate 仅做占位：如果要支持函数，配置就不再是纯 JSON（建议只保留表达式字符串）
  validate: nullOptional(z.union([ExprSchema(z.boolean())])),
});

/** BaseItem */
export const BaseItemSchema = z.object({
  id: z.string().trim().min(1, "id 不能为空"),
  label: nullOptional(z.string()),
  desc: nullOptional(z.string()),
  ui: UIHintsSchema,
  state: StateWhenSchema, // transform 后一定有默认值
  role: nullOptional(z.string()),
  meta: nullOptional(z.record(z.string(), z.any())),
});

/** ActionSpec（声明化动作） */
export const ActionSpecSchema = z.union([
  z.object({
    kind: z.literal("emit"),
    event: z.string().min(1),
    payload: z.union([z.any(), ExprStringSchema]).optional(),
  }),
  z.object({
    kind: z.literal("callback"),
    fn: z.string().min(1),
    payload: z.union([z.any(), ExprStringSchema]).optional(),
  }),
  z.object({
    kind: z.literal("navigate"),
    to: z.string().min(1),
    params: z.union([z.record(z.string(), z.any()), ExprStringSchema]).optional(),
  }),
  z.object({
    kind: z.literal("api"),
    apiName: z.string().min(1),
    body: z.union([z.record(z.string(), z.any()), ExprStringSchema]).optional(),
  }),
]);

/** 先声明 FormItemSchema 以支持递归 children */
export type FormItem = z.infer<typeof FormItemSchema>;
export const FormItemSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([FormFieldItemSchema, FormActionItemSchema])
);

/** FormFieldItem */
export const FormFieldItemSchema = BaseItemSchema.extend({
  type: z.literal("form"),
  control: z.string().trim().min(1, "control 不能为空"),
  props: nullOptional(z.record(z.string(), z.any())),
  modelPath: ModelPathSchema,
  required: nullOptional(ExprSchema(z.boolean())).default(false),
  rules: nullOptional(z.array(FieldRuleSchema)),
  children: nullOptional(z.array(FormItemSchema)),
}).transform((v) => ({
  ...v,
  required: v.required ?? false,
}));

/** FormActionItem */
export const FormActionItemSchema = BaseItemSchema.extend({
  type: z.literal("action"),
  actionType: z.string().trim().min(1, "actionType 不能为空"),
  renderer: nullOptional(z.string()),
  props: nullOptional(z.record(z.string(), z.any())),
  on: nullOptional(ActionSpecSchema),
});

/** 再把 lazy union 的两个分支补齐引用 */
const FormFieldItemSchemaRef = FormFieldItemSchema;
const FormActionItemSchemaRef = FormActionItemSchema;
// 让 TS 不抱怨未使用（某些配置下会）
void FormFieldItemSchemaRef;
void FormActionItemSchemaRef;

/** 顶层：允许传入数组配置 */
export const FormItemsSchema = z.array(FormItemSchema);

/**
 * parse：校验 + 默认值归一化
 * - 成功：返回“可直接渲染”的结构（state/required 已补齐默认值）
 * - 失败：抛出包含路径的错误，方便定位配置问题
 */
export function parseFormItems(input: unknown) {
  const res = FormItemsSchema.safeParse(input);
  if (!res.success) {
    // 你们也可以在这里改造成统一的错误格式
    throw new Error(res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
  }
  return res.data as FormItem[];
}
