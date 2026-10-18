import {
  buttonProps,
  layoutProps,
  textProps,
  groupedItemProps,
  stackProps,
  svgProps,
} from '@repo/contracts/plugins/kit';
import { isWireContainer } from '@repo/contracts/plugins/prepare-tree';
import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  childNodeKey,
  slotNodeKey,
} from '@repo/contracts/plugins/wire-node-key';
import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { StandaloneGroupedListItem } from '#primitives/lists/grouped-list-item';
import { Svg } from '#primitives/visual';
import type { PluginPart } from './plugin-parts';
import {
  entry,
  handlerOf,
  type Entry,
  type RenderContext,
  type PluginOnEvent,
} from './plugin-rendering';
import { Unsupported } from './plugin-unsupported';
import { usePluginUi } from './use-plugin-ui';

export type { PluginOnEvent } from './plugin-rendering';

export interface PluginTreeProps {
  root: WireNode;
  onEvent: PluginOnEvent;
}

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
    Svg: entry(svgProps, ({ onPress, ...props }, context) => (
      <Svg {...props} onPress={handlerOf(onPress, context)} />
    )),
  } satisfies Record<PluginPart, Entry>),
);

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
  const ui = usePluginUi(onEvent);

  const context = {
    onEvent: ui.send,
    key: childNodeKey('', root.key),
    ui,
    slots: {},
  };

  return <RenderNode node={root} context={context} />;
}

function renderedChildren(
  node: WireNode,
  context: RenderContext,
): React.ReactNode {
  return node.children.map((child) => (
    <RenderNode
      key={child.key}
      node={child}
      context={{ ...context, key: childNodeKey(context.key, child.key) }}
    />
  ));
}

function renderedSlots(
  node: WireNode,
  context: RenderContext,
): Record<string, React.JSX.Element> {
  return Object.fromEntries(
    Object.entries(node.slots).map(([name, children]) => [
      name,
      <View key={name}>
        {children.map((child) => slotNode(context, name, child))}
      </View>,
    ]),
  );
}

function slotNode(
  context: RenderContext,
  name: string,
  child: WireNode,
): React.JSX.Element {
  return (
    <RenderNode
      key={child.key}
      node={child}
      context={{ ...context, key: slotNodeKey(context.key, name, child.key) }}
    />
  );
}
