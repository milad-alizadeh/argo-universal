import { reconcileBinding } from './bind.mts';
import {
  equalValues,
  getRoot,
  required,
  type Binding,
  type DesignNode,
  type Snapshot,
} from './model.mts';
import { planStyles } from './plan-styles.mts';
import { planText } from './plan-text.mts';
import type { SyncPlan } from './plan-types.mts';

function planChild(
  plan: SyncPlan,
  source: DesignNode,
  slot: { index: number; target: DesignNode | undefined },
): void {
  const sourceId = required(source.childIds[slot.index]);
  const copyId = plan.binding.nodes[sourceId];

  if (samePosition(copyId, slot)) return;
  plan.moves.push({ sourceId, parentSourceId: source.id, index: slot.index });
}

function planChildren(
  plan: SyncPlan,
  source: DesignNode,
  target: DesignNode | undefined,
): void {
  for (const index of source.childIds.keys())
    planChild(plan, source, { index, target });
}

function validateCopy(master: Snapshot, copy: Snapshot, prior: Binding): void {
  if (getRoot(master).component !== getRoot(copy).component)
    throw new Error('Root node types differ');

  if (copy.nodes.some((node) => node.isLocked))
    throw new Error(`${prior.name}: copy contains locked nodes`);
}

function createPlan(
  input: Pick<SyncPlan, 'master' | 'before' | 'binding'>,
): SyncPlan {
  const structure = { creates: [], moves: [], removes: [] };

  return { ...input, ...structure, styles: [], texts: [], svgReplacements: [] };
}

function planCreation(plan: SyncPlan, source: DesignNode): void {
  if (!source.isVisible)
    throw new Error(`Creating hidden layers is not supported: ${source.name}`);
  plan.creates.push({
    sourceId: source.id,
    parentSourceId: required(source.parentId),
    node: source,
  });
}

function planExisting(
  plan: SyncPlan,
  source: DesignNode,
  target: DesignNode,
): void {
  if (source.nested) return;

  if (target.component !== source.component)
    throw new Error(`Mapped node type changed: ${source.name}`);
  planStyles(plan, source, target);
}

function planNode(plan: SyncPlan, source: DesignNode): void {
  if (!['Frame', 'Text', 'SVG'].includes(source.component))
    throw new Error(`Unsupported component node type: ${source.component}`);

  const target = plan.before.nodes.find(
    (node) => node.id === plan.binding.nodes[source.id],
  );

  if (target) planExisting(plan, source, target);
  else planCreation(plan, source);
  planChildren(plan, source, target);
}

export function planSync(
  master: Snapshot,
  copy: Snapshot,
  prior: Binding,
): SyncPlan {
  validateCopy(master, copy, prior);
  const binding = reconcileBinding(master, copy, prior);
  const plan = createPlan({ master, before: copy, binding });

  for (const source of master.nodes) planNode(plan, source);
  plan.removes = copy.nodes.flatMap((node) =>
    Object.values(plan.binding.nodes).includes(node.id) ? [] : [node.id],
  );
  planText(plan);

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

function samePosition(
  id: string | undefined,
  slot: { index: number; target: DesignNode | undefined },
): boolean {
  return Boolean(id && slot.target?.childIds[slot.index] === id);
}
