import { isWireContainer } from '@repo/contracts/plugins/prepare-tree';
import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  childNodeKey,
  slotNodeKey,
} from '@repo/contracts/plugins/wire-node-key';
import type * as React from 'react';
import { Fragment, cloneElement } from 'react';
import { pluginEntries } from './plugin-entries';
import type { RenderContext, PluginOnEvent } from './plugin-rendering';
import { Unsupported } from './plugin-unsupported';
import { usePluginUi } from './use-plugin-ui';

export type { PluginOnEvent } from './plugin-rendering';

export interface PluginTreeProps {
  root: WireNode;
  onEvent: PluginOnEvent;
}

const registry = new Map(Object.entries(pluginEntries));

interface RenderNodeProps {
  node: WireNode;
  context: RenderContext;
}

function RenderNode({
  node,
  context,
}: RenderNodeProps): React.JSX.Element | null {
  const known = registry.get(node.type);

  if (!known) return isWireContainer(node) ? <Unsupported /> : null;
  const children = renderedChildren(node, context);
  const filled = { ...context, slots: renderedSlots(node, context) };

  return known.render(node, filled, children);
}

export function PluginTree({
  root,
  onEvent,
}: PluginTreeProps): React.JSX.Element | null {
  const context = useRenderContext(root, onEvent);

  return <RenderNode node={root} context={context} />;
}

function useRenderContext(
  root: WireNode,
  onEvent: PluginOnEvent,
): RenderContext {
  const ui = usePluginUi(onEvent);

  return { onEvent: ui.send, key: childNodeKey('', root.key), ui, slots: {} };
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
): Record<string, React.JSX.Element> {
  return Object.fromEntries(
    Object.entries(node.slots).map(([name, children]) => [
      name,
      slotContent(context, name, children),
    ]),
  );
}

function slotContent(
  context: RenderContext,
  name: string,
  children: WireNode[],
): React.JSX.Element {
  const nodes = children.map((child) => slotNode(context, name, child));
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
