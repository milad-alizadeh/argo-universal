import type {
  PatchOp,
  PatchStep,
  WireJson,
  WireNode,
} from '@repo/contracts/plugins/wire';

// A node the reconciler holds; `slot` children are filled into the parent's named slots.
export interface Instance {
  type: string;
  props: Record<string, unknown>;
  children: Instance[];
}

export type Handlers = Map<string, (payload?: unknown) => unknown>;

const slotType = '#slot';

export const isSlot = (instance: Instance): boolean =>
  instance.type === slotType;

// Turns the reconciler's instances into wire nodes, collecting each function prop under its event id.
export function toWire(root: Instance, handlers: Handlers): WireNode {
  const [node] = wireChildren([root], '', handlers);

  if (!node) throw new Error('A page must render one component');

  return node;
}

function wireChildren(
  instances: Instance[],
  parent: string,
  handlers: Handlers,
): WireNode[] {
  return instances.map((instance, index) =>
    wireNode(instance, `${parent}${parent ? '/' : ''}${keyOf(instance, index)}`, handlers),
  );
}

const keyOf = (instance: Instance, index: number): string =>
  typeof instance.props.argoKey === 'string'
    ? instance.props.argoKey
    : String(index);

function wireNode(
  instance: Instance,
  id: string,
  handlers: Handlers,
): WireNode {
  const content = instance.children.filter((child) => !isSlot(child));
  const slots: WireNode['slots'] = {};

  for (const slot of instance.children.filter(isSlot)) {
    const [filled] = wireChildren(slot.children, `${id}#`, handlers);

    if (filled) slots[String(slot.props.name)] = filled;
  }

  return {
    type: instance.type,
    key: id.slice(id.lastIndexOf('/') + 1),
    props: wireProps(instance.props, id, handlers),
    children: wireChildren(content, id, handlers),
    slots,
  };
}

function wireProps(
  props: Record<string, unknown>,
  id: string,
  handlers: Handlers,
): Record<string, WireJson> {
  const wired: Record<string, WireJson> = {};

  for (const [name, value] of Object.entries(props)) {
    if (name === 'argoKey' || name === 'children' || value === undefined)
      continue;

    if (typeof value === 'function') {
      const eventId = `${id}:${name}`;
      handlers.set(eventId, value as Handlers extends Map<string, infer F> ? F : never);
      wired[name] = { $event: eventId };
    } else wired[name] = value as WireJson;
  }

  return wired;
}

const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const sameSlotNames = (left: WireNode, right: WireNode): boolean =>
  same(Object.keys(left.slots).sort(), Object.keys(right.slots).sort());

// The smallest patch that turns `before` into `after`; a structural change replaces its whole subtree.
export function diff(
  before: WireNode,
  after: WireNode,
  path: PatchStep[] = [],
): PatchOp[] {
  if (
    before.type !== after.type ||
    before.key !== after.key ||
    before.children.length !== after.children.length ||
    !sameSlotNames(before, after)
  )
    return [{ op: 'replace', path, node: after }];

  const ops: PatchOp[] = [];

  if (!same(before.props, after.props))
    ops.push({ op: 'props', path, props: after.props });
  after.children.forEach((child, index) =>
    ops.push(...diff(before.children[index] as WireNode, child, [...path, index])),
  );

  for (const [name, slot] of Object.entries(after.slots))
    ops.push(...diff(before.slots[name] as WireNode, slot, [...path, name]));

  return ops;
}
