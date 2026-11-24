import {
  kitComponent,
  type KitComponentDefinition,
} from '@repo/contracts/plugins/kit';
import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  childNodeKey,
  slotNodeKey,
} from '@repo/contracts/plugins/wire-node-key';
import { Fragment, createElement, type ElementType } from 'react';
import { pluginEntries } from './plugin-entries';
import {
  listEntriesOf,
  listRowsOf,
  tableRowsOf,
  type RowItem,
  type SectionDrawing,
} from './plugin-list-rows';
import type * as Rendering from './plugin-rendering';

const registry = new Map<string, ElementType>(Object.entries(pluginEntries));

type RenderNodeProps = { node: WireNode; context: Rendering.RenderContext };

/*
 * The Server prepared the tree (prepare-tree.ts): every node is a current kit component with valid props, and anything
 * it could not draw is already its "Update Argo" note. A node it left as it was draws as the element it drew before,
 * so its row does not draw again. Kit components read their children's types and props, so a node draws as its kit
 * element itself, never inside a wrapper of its own.
 */
export function RenderNode({
  node,
  context,
}: RenderNodeProps): React.JSX.Element | null {
  const drawn = context.drawn.get(context.key, node);

  if (drawn !== undefined) return drawn;

  const element = drawNode({ node, context });
  context.drawn.set(context.key, node, element);

  return element;
}

function drawNode({
  node,
  context,
}: RenderNodeProps): React.JSX.Element | null {
  const definition = kitComponent(node.type);
  const component = registry.get(node.type);

  if (!definition || !component) return null;

  const input = { node, definition, context, source: node.props };

  const slots = renderedSlots(node, definition, context);

  return renderComponent(component, input, slots);
}

function renderComponent(
  component: ElementType,
  input: Rendering.ControlInput,
  slots: Rendering.PluginProps,
): React.JSX.Element {
  const { node, definition, context } = input;
  const props = context.controls(input);

  const rows = listRowsOf(node) ?? tableRowsOf(node);
  const entries = rows
    ? undefined
    : listEntriesOf(node, context.key, sectionProps(context));

  if (rows) Object.assign(props, rows, { renderItem: rowRenderer(context) });
  else if (entries)
    Object.assign(props, {
      entries,
      renderEntry: entryRenderer(context),
      recycleItems: true,
    });
  else if (definition.children)
    props.children = renderedChildren(node.children, context);

  return createElement(component, {
    ...props,
    ...slots,
    key: elementKey(node, context.key),
  });
}

// A List's row as data: drawn at the address its child would have, from the same cache of drawn nodes.
const rowRenderer =
  (context: Rendering.RenderContext) =>
  (node: WireNode): React.JSX.Element | null =>
    RenderNode({
      node,
      context: { ...context, key: childNodeKey(context.key, node.key) },
    });

// A row of an entry List, drawn at its own address, from the same cache of drawn nodes.
const entryRenderer =
  (context: Rendering.RenderContext) =>
  ({ node, key }: RowItem): React.JSX.Element | null =>
    RenderNode({ node, context: { ...context, key } });

/*
 * A Section's own props, held as the element they draw, so a Section its node left as it was has the same props and
 * the kit keeps the header and footer it drew.
 */
const sectionProps =
  (context: Rendering.RenderContext) =>
  (node: WireNode, key: string): SectionDrawing => {
    const scoped = { ...context, key };
    const held = scoped.drawn.get(key, node);

    if (held) return held.props as SectionDrawing;

    const definition = kitComponent(node.type);
    const component = registry.get(node.type);

    if (!definition || !component) return {};

    const input = { node, definition, context: scoped, source: node.props };
    const props = {
      ...scoped.controls(input),
      ...renderedSlots(node, definition, scoped),
    };

    scoped.drawn.set(key, node, createElement(component, props));

    return props as SectionDrawing;
  };

function renderedChildren(
  nodes: WireNode[],
  context: Rendering.RenderContext,
  slot?: string,
): (React.JSX.Element | null)[] {
  return nodes.map((node) => {
    const key =
      slot === undefined
        ? childNodeKey(context.key, node.key)
        : slotNodeKey(context.key, slot, node.key);

    return RenderNode({ node, context: { ...context, key } });
  });
}

function renderedSlots(
  node: WireNode,
  definition: KitComponentDefinition,
  context: Rendering.RenderContext,
): Record<string, React.JSX.Element> {
  const slots = Object.keys(definition.slots).filter(
    (name) => node.slots[name],
  );

  return Object.fromEntries(
    slots.map((name) => {
      const nodes = renderedChildren(node.slots[name] ?? [], context, name);

      return [name, slotContent(nodes, name)];
    }),
  );
}

function slotContent(
  nodes: (React.JSX.Element | null)[],
  key: string,
): React.JSX.Element {
  const first = nodes.at(0);

  if (nodes.length === 1 && first) return first;

  return createElement(Fragment, { key }, nodes);
}

function elementKey(node: WireNode, scopedKey: string): string {
  return node.type.startsWith('Canvas.') ? node.key : scopedKey;
}
