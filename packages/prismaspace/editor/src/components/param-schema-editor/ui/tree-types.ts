import type { SchemaType } from "../core";

/**
 * 输入给变量引用面板的树节点。
 *
 * 约定：
 * - `label` 只用于展示，不应承担引用标识职责。
 * - 引用标识优先使用显式的 `blockID` / `path`。
 * - 当显式引用字段缺失时，会退回到 `id` / `key` / `name` 等稳定字段推导。
 * - `title` 仅保留为兼容历史入参，新增代码应优先使用 `label`。
 */
export interface VariableTreeNode {
  /**
   * 稳定的源节点 ID。
   * 推荐提供，用于在缺少显式 `blockID` / `path` 时推导引用标识。
   */
  id?: string;

  /**
   * 稳定的树节点 key。
   * 推荐提供，用于树展开态、选中态和兜底身份标识。
   */
  key?: string | number;

  /**
   * 稳定的变量名或路径片段。
   * 当未显式提供 `path` 时，会优先使用它推导相对引用路径。
   */
  name?: string;

  /**
   * 面板中展示给用户的友好名称。
   * 仅用于 UI，不应被当作真实引用路径的一部分。
   */
  label?: string;

  /**
   * 历史遗留的展示字段，语义等同于 `label`。
   * @deprecated 请优先使用 `label`
   */
  title?: string;

  /**
   * 节点在所属 `blockID` 下的相对引用路径。
   * 推荐直接提供稳定值，例如 `output.text`。
   */
  path?: string;

  /**
   * 引用所属的源节点 ID。
   * 当提供该值但未提供 `path` 时，当前节点会被视为 block 根节点。
   */
  blockID?: string;

  /**
   * 可选的来源标识，用于区分多来源引用。
   */
  source?: string;

  /**
   * 节点值的 schema 类型。
   */
  schemaType?: SchemaType;

  /**
   * 是否允许直接引用当前节点。
   * 未显式提供时，会根据节点是否为叶子/是否有显式引用标识自动推断。
   */
  selectable?: boolean;

  /**
   * 子节点列表。
   */
  children?: VariableTreeNode[];
}
