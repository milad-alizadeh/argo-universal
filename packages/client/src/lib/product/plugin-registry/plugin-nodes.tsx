import { wirePart, type WirePartDefinition } from '@repo/contracts/plugins/kit';
import { isWireContainer } from '@repo/contracts/plugins/prepare-tree';
import { WireJson, type WireNode } from '@repo/contracts/plugins/wire';
import {
  childNodeKey,
  slotNodeKey,
} from '@repo/contracts/plugins/wire-node-key';
import { Fragment, cloneElement, createElement, type ElementType } from 'react';
import { z } from 'zod';
import type { PluginProps } from './plugin-control-types';
import { pluginEntries } from './plugin-entries';
import { legacyNode, legacySlots } from './plugin-legacy';
import type { RenderContext } from './plugin-rendering';
import { Unsupported } from './plugin-unsupported';

const registry = new Map<string, ElementType>(Object.entries(pluginEntries));

interface RenderNodeProps {
  node: WireNode;
  context: RenderContext;
}

export function RenderNode({
  node,
  context,
}: RenderNodeProps): React.JSX.Element | null {
  const part = wirePart(node.type);

  if (!part) return refused(node);

  const parsed = parsedProps(node, part);

  if (!parsed.success) return refused(node);
  const prepared = legacyNode({ ...node, props: parsed.data });

  const slots = legacySlots(
    node.type,
    renderedSlots(node, context, part.slots),
  );

  return renderPrepared({ node: prepared, context }, slots);
}

function refused(node: WireNode): React.JSX.Element | null {
  return isWireContainer(node) ? <Unsupported /> : null;
}

function renderPrepared(
  { node, context }: RenderNodeProps,
  slots: PluginProps,
): React.JSX.Element | null {
  const component = registry.get(node.type);
  const part = wirePart(node.type);

  if (!component || !part) return refused(node);
  const props = context.controls({ node, part, context });

  Object.assign(props, childProps(node, part, context));

  return createElement(component, { ...props, ...slots });
}

function renderedChildren(
  node: WireNode,
  context: RenderContext,
): React.ReactNode {
  return node.children.map((child) => {
    const rendered = RenderNode({
      node: child,
      context: { ...context, key: childNodeKey(context.key, child.key) },
    });

    return rendered ? cloneElement(rendered, { key: child.key }) : null;
  });
}

function renderedSlots(
  node: WireNode,
  context: RenderContext,
  declared: Record<string, readonly string[]>,
): Record<string, React.JSX.Element> {
  return Object.fromEntries(
    Object.keys(declared)
      .filter((name) => node.slots[name])
      .map((name) => [name, renderSlot(node, name, context)]),
  );
}

function renderSlot(
  node: WireNode,
  name: string,
  context: RenderContext,
): React.JSX.Element {
  const nodes = (node.slots[name] ?? []).map((child) =>
    slotNode(context, name, child),
  );

  return slotContent(nodes, name);
}

function slotContent(
  nodes: (React.JSX.Element | null)[],
  name: string,
): React.JSX.Element {
  const first = nodes.at(0);

  if (nodes.length === 1 && first) return first;

  return <Fragment key={name}>{nodes}</Fragment>;
}

function slotNode(
  context: RenderContext,
  name: string,
  child: WireNode,
): React.JSX.Element | null {
  const rendered = RenderNode({
    node: child,
    context: { ...context, key: slotNodeKey(context.key, name, child.key) },
  });

  return rendered ? cloneElement(rendered, { key: child.key }) : null;
}

function parsedProps(
  node: WireNode,
  part: WirePartDefinition,
): ReturnType<
  ReturnType<typeof z.record<z.ZodString, typeof WireJson>>['safeParse']
> {
  return (part.appProps ?? part.props)
    .pipe(z.record(z.string(), WireJson))
    .safeParse(node.props);
}

function childProps(
  node: WireNode,
  part: WirePartDefinition,
  context: RenderContext,
): { children?: React.ReactNode } {
  return part.children ? { children: renderedChildren(node, context) } : {};
}
