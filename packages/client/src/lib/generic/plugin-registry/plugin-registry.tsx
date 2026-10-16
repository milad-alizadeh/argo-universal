import type { WireNode } from '@repo/contracts/plugins/wire';
import { Handler } from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import { View } from 'react-native';
import type { z } from 'zod';
import { Button } from '#primitives/buttons/button';
import { Text } from '#primitives/display/text';
import { runAction } from './plugin-registry-actions';
import {
  buttonProps,
  gapSteps,
  layoutProps,
  textProps,
} from './plugin-registry-schemas';

export interface PluginTreeProps {
  root: WireNode;
  // Sends an event id back to the Plugin that owns the page.
  onEvent: (eventId: string) => void;
}

interface RenderContext {
  onEvent: (eventId: string) => void;
}

type Props<Schema extends z.ZodType> = z.output<Schema>;

// Static classes, so Uniwind can see every one.
const gapClass = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
} as const satisfies Record<(typeof gapSteps)[number], string>;

const alignClass = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const;

function handlerOf(
  value: unknown,
  { onEvent }: RenderContext,
): (() => void) | undefined {
  const parsed = Handler.safeParse(value);

  if (!parsed.success) return undefined;
  const handler = parsed.data;

  return () => {
    if ('$event' in handler) onEvent(handler.$event);
    else runAction(handler);
  };
}

function layout(
  direction: 'flex-row' | 'flex-col',
  props: Props<typeof layoutProps>,
  children: React.ReactNode,
): React.JSX.Element {
  return (
    <View
      className={`${direction} ${gapClass[props.gap ?? 0]} ${alignClass[props.align ?? 'stretch']}`}
    >
      {children}
    </View>
  );
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
const registry: Record<string, Entry> = {
  Text: entry(textProps, ({ label, role, tone }) => (
    <Text role={role} tone={tone}>
      {label}
    </Text>
  )),
  Button: entry(buttonProps, ({ onPress, ...props }, context) => (
    <Button {...props} onPress={handlerOf(onPress, context)} />
  )),
  Row: entry(layoutProps, (props, _context, children) =>
    layout('flex-row', props, children),
  ),
  Column: entry(layoutProps, (props, _context, children) =>
    layout('flex-col', props, children),
  ),
};

function RenderNode({
  node,
  context,
}: {
  node: WireNode;
  context: RenderContext;
}): React.JSX.Element | null {
  const known = registry[node.type];
  const container = node.children.length > 0 || Object.keys(node.slots).length > 0;

  // An unknown leaf is dropped; an unknown container says the App is older than the Plugin.
  if (!known) return container ? <Unsupported /> : null;
  const children = node.children.map((child) => (
    <RenderNode key={child.key} node={child} context={context} />
  ));

  return known.render(node, context, children);
}

function Unsupported(): React.JSX.Element {
  return (
    <Text role="secondary" tone="muted">
      Update Argo to see this
    </Text>
  );
}

// Draws a Plugin page's wire tree with the real kit components.
export function PluginTree({
  root,
  onEvent,
}: PluginTreeProps): React.JSX.Element | null {
  return <RenderNode node={root} context={{ onEvent }} />;
}
