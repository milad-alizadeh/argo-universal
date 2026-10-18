import type { WireNode } from '@repo/contracts/plugins/wire';
import { Stack } from '#primitives/layout/stack';
import type { PluginProps } from './plugin-rendering';

const aliases = new Map(
  Object.entries({ VirtualList: 'plain', GroupedList: 'grouped' }),
);

// Legacy wire aliases lower to actual kit components while retaining their event addresses.
export function legacyNode(node: WireNode): WireNode {
  const appearance = aliases.get(node.type);

  if (appearance) return { ...node, type: 'List', props: { appearance } };

  return legacyStack(node);
}

const directions = new Map(Object.entries({ Row: 'row', Column: 'column' }));

function legacyStack(node: WireNode): WireNode {
  const direction = directions.get(node.type);

  return direction
    ? { ...node, type: 'Stack', props: { ...node.props, direction } }
    : legacyItem(node);
}

function legacyItem(node: WireNode): WireNode {
  if (node.type !== 'GroupedListItem') return node;
  const { label, ...props } = node.props;

  if (typeof label !== 'string') return node;

  return { ...node, type: 'ListItem', props: { ...props, title: label } };
}

type RenderedSlots = Record<string, React.JSX.Element>;

export function legacySlots(type: string, slots: RenderedSlots): PluginProps {
  if (type !== 'GroupedListItem') return slots;

  const { leading, accessories: trailing } = slots;
  const meta = legacyMeta(slots);

  return { leading, trailing, meta };
}

function legacyMeta(slots: RenderedSlots): React.JSX.Element | undefined {
  if (!slots.detail && !slots.footer) return undefined;

  return (
    <Stack direction="column">
      {slots.detail}
      {slots.footer}
    </Stack>
  );
}
