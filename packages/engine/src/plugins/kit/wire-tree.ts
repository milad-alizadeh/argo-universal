import type { WireJson, WireNode } from '@repo/contracts/plugins/wire';

// A handler a Plugin passes as a prop; the wire carries it as an event id.
type PluginFn = (payload?: WireJson) => void | Promise<void>;

export type Prop = WireJson | PluginFn;

export type Props = Record<string, Prop>;

// A node the reconciler holds; `#slot` children are filled into the parent's named slots.
export interface Instance {
  type: string;
  key?: string;
  props: Props;
  children: Instance[];
  // Set on the root only: the host calls it after every commit.
  onCommit?: () => void;
}

export type Handlers = Map<string, PluginFn>;

const slotType = '#slot';

const isSlot = (instance: Instance): boolean => instance.type === slotType;

const keyOf = (instance: Instance, index: number): string =>
  instance.key ?? String(index);

function wireProp(eventId: string, value: Prop, handlers: Handlers): WireJson {
  if (typeof value !== 'function') return value;
  handlers.set(eventId, value);

  return { $event: eventId };
}

function wireProps(
  props: Props,
  id: string,
  handlers: Handlers,
): WireNode['props'] {
  return Object.fromEntries(
    Object.entries(props).map(([name, value]) => [
      name,
      wireProp(`${id}:${name}`, value, handlers),
    ]),
  );
}

function wireSlots(
  instance: Instance,
  id: string,
  handlers: Handlers,
): WireNode['slots'] {
  const filled = instance.children.filter(isSlot).flatMap((slot) => {
    const [content] = wireChildren(slot.children, `${id}#`, handlers);

    return slot.key && content ? [[slot.key, content] as const] : [];
  });

  return Object.fromEntries(filled);
}

function wireNode(
  instance: Instance,
  id: string,
  handlers: Handlers,
): WireNode {
  const content = instance.children.filter((child) => !isSlot(child));

  return {
    type: instance.type,
    key: id.slice(id.lastIndexOf('/') + 1),
    props: wireProps(instance.props, id, handlers),
    children: wireChildren(content, id, handlers),
    slots: wireSlots(instance, id, handlers),
  };
}

function wireChildren(
  instances: Instance[],
  parent: string,
  handlers: Handlers,
): WireNode[] {
  return instances.map((instance, index) =>
    wireNode(
      instance,
      `${parent}${parent ? '/' : ''}${keyOf(instance, index)}`,
      handlers,
    ),
  );
}

// Turns the reconciler's instances into wire nodes, collecting each function prop under its event id.
export function toWire(root: Instance, handlers: Handlers): WireNode {
  const [node] = wireChildren([root], '', handlers);

  if (!node) throw new Error('A page must render one component');

  return node;
}
