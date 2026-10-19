import { labelOf, reconcileBinding } from './bind.mts';
import {
  equalValues,
  getRoot,
  layoutKeys,
  type Binding,
  type DesignNode,
  type Snapshot,
  type Styles,
} from './model.mts';

export type Creation = {
  sourceId: string;
  parentSourceId: string;
  node: DesignNode;
};
export type StyleEdit = { sourceId: string; styles: Styles };
export type Move = { sourceId: string; parentSourceId: string; index: number };
export type SyncPlan = {
  master: Snapshot;
  before: Snapshot;
  binding: Binding;
  creates: Creation[];
  moves: Move[];
  removes: string[];
  styles: StyleEdit[];
  texts: { sourceId: string; text: string }[];
  svgReplacements: string[];
};

function desiredStyles(
  master: DesignNode,
  binding: Binding,
  rootId: string,
): Styles {
  if (master.id !== rootId) return master.styles;
  const styles = Object.fromEntries(
    Object.entries(master.styles).filter(([key]) => !layoutKeys.has(key)),
  );
  return { ...styles, ...binding.layout };
}

function normalizePadding(styles: Styles): Styles {
  return Object.fromEntries(
    Object.entries(styles).filter(
      ([key, value]) =>
        !(key.startsWith('padding') && /^(0|0px)$/.test(String(value))),
    ),
  );
}

function stylePatch(expected: Styles, current: Styles): Styles {
  const desired = normalizePadding(expected);
  const actual = normalizePadding(current);
  const patch: Styles = {};
  for (const [key, value] of Object.entries(desired))
    if (actual[key] !== value) patch[key] = value;
  for (const key of Object.keys(actual)) if (!(key in desired)) patch[key] = '';
  return patch;
}

function planStyles(
  plan: SyncPlan,
  source: DesignNode,
  target: DesignNode,
): void {
  const patch = stylePatch(
    desiredStyles(source, plan.binding, plan.master.rootId),
    target.styles,
  );
  if (Object.keys(patch).length)
    plan.styles.push({ sourceId: source.id, styles: patch });
  if (source.svg && source.svg !== target.svg)
    plan.svgReplacements.push(source.id);
}

function planChildren(
  plan: SyncPlan,
  source: DesignNode,
  target: DesignNode | undefined,
): void {
  source.childIds.forEach((sourceId, index) => {
    const copyId = plan.binding.nodes[sourceId];
    if (!copyId || target?.childIds[index] !== copyId)
      plan.moves.push({ sourceId, parentSourceId: source.id, index });
  });
}

function planLabel(plan: SyncPlan): void {
  const label = labelOf(plan.master);
  if (!label) return;
  const text = plan.binding.textOverrides.label ?? label.textContent ?? '';
  const current = plan.before.nodes.find(
    (node) => node.id === plan.binding.nodes[label.id],
  );
  if (current?.textContent !== text)
    plan.texts.push({ sourceId: label.id, text });
  plan.binding.lastText.label = text;
}

export function planSync(
  master: Snapshot,
  copy: Snapshot,
  prior: Binding,
): SyncPlan {
  if (getRoot(master).component !== getRoot(copy).component)
    throw new Error('Root node types differ');
  if (copy.nodes.some((node) => node.isLocked))
    throw new Error(`${prior.name}: copy contains locked nodes`);
  const binding = reconcileBinding(master, copy, prior);
  const plan: SyncPlan = {
    master,
    before: copy,
    binding,
    creates: [],
    moves: [],
    removes: [],
    styles: [],
    texts: [],
    svgReplacements: [],
  };
  for (const source of master.nodes) {
    if (!['Frame', 'Text', 'SVG'].includes(source.component))
      throw new Error(`Unsupported Button node type: ${source.component}`);
    const target = copy.nodes.find(
      (node) => node.id === binding.nodes[source.id],
    );
    if (target && target.component !== source.component)
      throw new Error(`Mapped node type changed: ${source.name}`);
    if (!target && !source.isVisible)
      throw new Error(
        `Creating hidden layers is not supported: ${source.name}`,
      );
    if (target) planStyles(plan, source, target);
    else
      plan.creates.push({
        sourceId: source.id,
        parentSourceId: source.parentId!,
        node: source,
      });
    planChildren(plan, source, target);
  }
  plan.removes = copy.nodes
    .filter((node) => !Object.values(binding.nodes).includes(node.id))
    .map((node) => node.id);
  planLabel(plan);
  return plan;
}

export function hasChanges(plan: SyncPlan): boolean {
  return !!(
    plan.creates.length +
    plan.moves.length +
    plan.removes.length +
    plan.styles.length +
    plan.texts.length +
    plan.svgReplacements.length
  );
}

export function sameSnapshot(first: Snapshot, second: Snapshot): boolean {
  return equalValues(first, second);
}
