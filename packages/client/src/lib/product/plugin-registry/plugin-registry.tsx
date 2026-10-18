import type { PluginInteraction, WireNode } from '@repo/contracts/plugins/wire';
import type { Handler } from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import type { z } from 'zod';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { runAction } from './plugin-registry-actions';
import {
  buttonProps,
  layoutProps,
  stackProps,
  textProps,
} from './plugin-registry-schemas';
import { usePluginUi, type PluginUi } from './use-plugin-ui';

export type PluginOnEvent = (
  key: string,
  interaction: PluginInteraction,
) => void | Promise<void>;

export interface PluginTreeProps {
  root: WireNode;
  onEvent: PluginOnEvent;
}

interface RenderContext {
  onEvent: PluginOnEvent;
  key: string;
  ui: PluginUi;
}

type Props<Schema extends z.ZodType> = z.output<Schema>;

function handlerOf(
  handler: Handler | undefined,
  { onEvent, key }: RenderContext,
): (() => void) | undefined {
  if (!handler) return undefined;

  return () => {
    if ('$event' in handler)
      void Promise.resolve(onEvent(key, { event: 'onPress' })).catch(() => {});
    else void runAction(handler);
  };
}

interface Entry {
  render: (
    node: WireNode,
    context: RenderContext,
    children: React.ReactNode,
  ) => React.JSX.Element | null;
}

// Parses a node's props, and leaves the node out when they do not fit its schema.
function entry<Schema extends z.ZodType>(
  schema: Schema,
  render: (
    props: Props<Schema>,
    context: RenderContext,
    children: React.ReactNode,
  ) => React.JSX.Element,
): Entry {
  return {
    render: (node, context, children) => {
      const parsed = schema.safeParse(node.props);

      return parsed.success ? render(parsed.data, context, children) : null;
    },
  };
}

// The first slice of the registry: the wire types the App draws today.
const registry = new Map(
  Object.entries({
    Text: entry(textProps, ({ label, variant, tone }) => (
      <Text role={variant} tone={tone}>
        {label}
      </Text>
    )),
    Button: entry(buttonProps, ({ onPress, ...props }, context) => (
      <Button {...props} onPress={handlerOf(onPress, context)} />
    )),
    Stack: entry(stackProps, ({ direction, ...props }, _context, children) => (
      <Stack direction={direction} {...props}>
        {children}
      </Stack>
    )),
    Row: entry(layoutProps, (props, _context, children) => (
      <Stack direction="row" {...props}>
        {children}
      </Stack>
    )),
    Column: entry(layoutProps, (props, _context, children) => (
      <Stack direction="column" {...props}>
        {children}
      </Stack>
    )),
  } satisfies Record<string, Entry>),
);

const isContainer = (node: WireNode): boolean =>
  node.children.length > 0 || Object.keys(node.slots).length > 0;

function Unsupported(): React.JSX.Element {
  return (
    <Text role="secondary" tone="muted">
      Update Argo to see this
    </Text>
  );
}

interface RenderNodeProps {
  node: WireNode;
  context: RenderContext;
}

function RenderNode({
  node,
  context,
}: RenderNodeProps): React.JSX.Element | null {
  const known = registry.get(node.type);

  // An unknown leaf is dropped; an unknown container says the App is older than the Plugin.
  if (!known) return isContainer(node) ? <Unsupported /> : null;

  const children = node.children.map((child) => (
    <RenderNode key={child.key} node={child} context={context} />
  ));

  return known.render(node, { ...context, key: node.key }, children);
}

// Draws a Plugin page's wire tree with the real kit components.
export function PluginTree({
  root,
  onEvent,
}: PluginTreeProps): React.JSX.Element | null {
  const ui = usePluginUi(onEvent);

  return (
    <RenderNode node={root} context={{ onEvent: ui.send, key: root.key, ui }} />
  );
}
