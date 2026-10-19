import { wirePart, type WirePartDefinition } from '@repo/contracts/plugins/kit';
import { isWireContainer } from '@repo/contracts/plugins/prepare-tree';
import { WireJson, type WireNode } from '@repo/contracts/plugins/wire';
import {
  childNodeKey,
  slotNodeKey,
} from '@repo/contracts/plugins/wire-node-key';
import { Fragment, createElement, type ElementType } from 'react';
import { z } from 'zod';
import { Text } from '#primitives/content/text';
import { pluginEntries } from './plugin-entries';
import type * as Rendering from './plugin-rendering';

const registry = new Map<string, ElementType>(Object.entries(pluginEntries));

type RenderNodeProps = { node: WireNode; context: Rendering.RenderContext };

export function RenderNode({
  node,
  context,
}: RenderNodeProps): React.JSX.Element | null {
  const part = wirePart(node.type);

  if (!part) return refused(node);
  const input = parsedInput(node, part, context);

  if (!input) return refused(node);

  return renderParsed(input, renderedSlots(node, part, context));
}

function parsedInput(
  node: WireNode,
  part: WirePartDefinition,
  context: Rendering.RenderContext,
): Rendering.ControlInput | null {
  const parsed = (part.appProps ?? part.props)
    .pipe(z.record(z.string(), WireJson))
    .safeParse(node.props);

  if (!parsed.success) return null;
  const props = parsed.data;

  return { node: { ...node, props }, part, context, source: node.props };
}

function renderParsed(
  input: Rendering.ControlInput,
  slots: Rendering.PluginProps,
): React.JSX.Element | null {
  const { node, part, context } = input;
  const component = registry.get(node.type);

  if (!component) return refused(node);
  const props = context.controls(input);

  if (part.children) props.children = renderedChildren(node.children, context);

  return createElement(component, { ...props, ...slots, key: context.key });
}

function refused(node: WireNode): React.JSX.Element | null {
  if (!isWireContainer(node)) return null;

  const props = {
    role: 'secondary',
    tone: 'muted',
    children: 'Update Argo to see this',
  } as const;

  return <Text key={node.key} {...props} />;
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
      const children = node.slots[name] ?? [];

      const nodes = renderedChildren(children, context, name);

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
