import { z } from 'zod';
import { kitComponent } from './kit';
import {
  acceptsChildren,
  acceptsSlots,
  type ChildRule,
  type SlotRules,
} from './prepare-slots';
import { refusedBelowRoot, rootSlotComponents } from './root-only';
import { WireJson, type WireNode } from './wire';

const jsonProps = z.record(z.string(), WireJson);

const hasSlots = (node: WireNode): boolean =>
  Object.keys(node.slots).length > 0;

const hasContent = (node: WireNode): boolean =>
  node.children.length > 0 || hasSlots(node);

export { isRootOnly, refusedBelowRoot, rootSlotComponents } from './root-only';

export const isWireContainer = (node: WireNode): boolean =>
  Boolean(kitComponent(node.type)?.container) || hasContent(node);

// Shown for a container no App can draw, and for a whole Plugin tree when the App is older than the wire minimum.
export function updateArgoNode(key: string): WireNode {
  return {
    type: 'Text',
    key,
    props: {
      children: 'Update Argo to see this',
      role: 'secondary',
      tone: 'muted',
    },
    children: [],
    slots: {},
  };
}

function unsupported(node: WireNode): WireNode | null {
  return isWireContainer(node) ? updateArgoNode(node.key) : null;
}

function parsedNode(node: WireNode, schema: z.ZodType): WireNode | null {
  const parsed = schema.safeParse(node.props);

  return parsed.success
    ? { ...node, props: jsonProps.parse(parsed.data) }
    : null;
}

const styled = (node: WireNode): boolean =>
  'className' in node.props || 'style' in node.props;

interface ContentRules {
  children: ChildRule;
  slots: SlotRules;
}

const validContent = (node: WireNode, rules: ContentRules): boolean =>
  acceptsSlots(node, rules.slots) &&
  acceptsChildren(node.children, rules.children);

const allowedStructure = (node: WireNode, rules: ContentRules): boolean =>
  !styled(node) && validContent(node, rules);

function currentNode(node: WireNode): WireNode | null {
  const component = kitComponent(node.type);

  if (!component) return null;

  if (!allowedStructure(node, component)) return null;

  return parsedNode(node, component.props);
}

function prepareNodes(
  nodes: WireNode[],
  roots: readonly string[] = [],
): WireNode[] {
  return nodes.flatMap((child) => {
    const next = refusedBelowRoot(child, roots)
      ? unsupported(child)
      : prepare(child);

    return next ? [next] : [];
  });
}

function slotsOf(node: WireNode): WireNode['slots'] {
  return Object.fromEntries(
    Object.entries(node.slots).flatMap(([name, children]) => {
      const prepared = prepareNodes(children, rootSlotComponents(node, name));

      return prepared.length ? [[name, prepared]] : [];
    }),
  );
}

function prepare(node: WireNode): WireNode | null {
  const current = currentNode(node);

  if (!current) return unsupported(node);

  return {
    ...current,
    children: prepareNodes(node.children),
    slots: slotsOf(node),
  };
}

// Every tree is checked against the one current schema set before it reaches an App.
export function prepareWireTree(root: WireNode): WireNode {
  return (
    prepare(root) ?? {
      type: '#empty',
      key: root.key,
      props: {},
      children: [],
      slots: {},
    }
  );
}

export function supportsWireNode(node: WireNode): boolean {
  return Boolean(currentNode(node));
}
