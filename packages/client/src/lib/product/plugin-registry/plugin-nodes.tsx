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
import type * as Rendering from './plugin-rendering';

const registry = new Map<string, ElementType>(Object.entries(pluginEntries));

type RenderNodeProps = { node: WireNode; context: Rendering.RenderContext };

// The Server prepared the tree (prepare-tree.ts): every node is a current kit component with valid props, and anything it could not draw is already its "Update Argo" note.
export function RenderNode({
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

  if (definition.children)
    props.children = renderedChildren(node.children, context);

  return createElement(component, {
    ...props,
    ...slots,
    key: elementKey(node, context.key),
  });
}

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
