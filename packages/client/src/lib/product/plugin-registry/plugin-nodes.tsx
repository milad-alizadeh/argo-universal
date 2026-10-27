import { wirePart, type WirePartDefinition } from '@repo/contracts/plugins/kit';
import { WireJson, type WireNode } from '@repo/contracts/plugins/wire';
import {
  childNodeKey,
  slotNodeKey,
} from '@repo/contracts/plugins/wire-node-key';
import { Fragment, createElement, type ElementType } from 'react';
import { z } from 'zod';
import { pluginEntries } from './plugin-entries';
import type * as Rendering from './plugin-rendering';

const registry = new Map<string, ElementType>(Object.entries(pluginEntries));

type RenderNodeProps = { node: WireNode; context: Rendering.RenderContext };

// The Server prepared the tree (prepare-tree.ts): every node is a current part with valid props, and anything it could not draw is already its "Update Argo" note.
export function RenderNode({
  node,
  context,
}: RenderNodeProps): React.JSX.Element | null {
  const part = wirePart(node.type);
  const component = registry.get(node.type);

  if (!part || !component) return null;

  const input = {
    node: appNode(node, part),
    part,
    context,
    source: node.props,
  };

  return renderPart(component, input, renderedSlots(node, part, context));
}

const jsonProps = z.record(z.string(), WireJson);

// The props only the App adds, such as an Action's `plugin` mark.
function appNode(node: WireNode, part: WirePartDefinition): WireNode {
  if (!part.appProps) return node;

  return { ...node, props: part.appProps.pipe(jsonProps).parse(node.props) };
}

function renderPart(
  component: ElementType,
  input: Rendering.ControlInput,
  slots: Rendering.PluginProps,
): React.JSX.Element {
  const { node, part, context } = input;
  const props = context.controls(input);

  if (part.children) props.children = renderedChildren(node.children, context);

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
  part: WirePartDefinition,
  context: Rendering.RenderContext,
): Record<string, React.JSX.Element> {
  const slots = Object.keys(part.slots).filter((name) => node.slots[name]);

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
