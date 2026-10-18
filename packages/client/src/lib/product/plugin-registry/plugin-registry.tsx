import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Handler } from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import { View } from 'react-native';
import type { z } from 'zod';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { StandaloneGroupedListItem } from '#primitives/lists/grouped-list-item';
import { runAction } from './plugin-registry-actions';
import {
  buttonProps,
  layoutProps,
  textProps,
  groupedItemProps,
  stackProps,
} from '@repo/contracts/plugins/kit';
import { isWireContainer } from '@repo/contracts/plugins/prepare-tree';
import type { PluginPart } from './plugin-parts';

export interface PluginTreeProps {
  root: WireNode;
  // Sends an event id back to the Plugin that owns the page.
  onEvent: (eventId: string) => void;
}

interface RenderContext {
  onEvent: (eventId: string) => void;
}

type Props<Schema extends z.ZodType> = z.output<Schema>;

function handlerOf(
  handler: Handler | undefined,
  { onEvent }: RenderContext,
): (() => void) | undefined {
  if (!handler) return undefined;

  return () => {
    if ('$event' in handler) onEvent(handler.$event);
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

type RenderEntry<Schema extends z.ZodType> = (
  props: Props<Schema>,
  context: RenderContext & { slots: Record<string, React.JSX.Element> },
  children: React.ReactNode,
) => React.JSX.Element;

// Shared schemas strip newer optional props; invalid containers keep their fallback.
function entry<Schema extends z.ZodType>(
  schema: Schema,
  render: RenderEntry<Schema>,
): Entry {
  return {
    render: (node, context, children) => {
      const parsed = schema.safeParse(node.props);
      if (!parsed.success) return isWireContainer(node) ? <Unsupported /> : null;

      return render(parsed.data, { ...context, slots: renderedSlots(node, context) }, children);
    },
  };
}

// The first slice of the registry: the wire types the App draws today.
const registry = new Map(
  Object.entries({
    GroupedListItem: entry(groupedItemProps, (props, context) => (
      <StandaloneGroupedListItem
        {...props}
        onPress={handlerOf(props.onPress, context)}
        leading={context.slots.leading}
        leadingLayout="content"
        accessory={context.slots.accessories}
        footer={context.slots.footer}
        detail={context.slots.detail}
      />
    )),
    Text: entry(textProps, ({ label, variant, ...props }) => (
      <Text role={variant} {...props}>
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
  } satisfies Record<PluginPart, Entry>),
);

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
  if (!known) return isWireContainer(node) ? <Unsupported /> : null;

  const children = node.children.map((child) => (
    <RenderNode key={child.key} node={child} context={context} />
  ));

  return known.render(node, context, children);
}

// Draws a Plugin page's wire tree with the real kit components.
export function PluginTree({
  root,
  onEvent,
}: PluginTreeProps): React.JSX.Element | null {
  return <RenderNode node={root} context={{ onEvent }} />;
}

function renderedSlots(
  node: WireNode,
  context: RenderContext,
): Record<string, React.JSX.Element> {
  return Object.fromEntries(
    Object.entries(node.slots).map(([name, children]) => [
      name,
      <View key={name}>
        {children.map((child) => (
          <RenderNode key={child.key} node={child} context={context} />
        ))}
      </View>,
    ]),
  );
}
