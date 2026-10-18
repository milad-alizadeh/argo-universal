import type { WireNode } from '@repo/contracts/plugins/wire';
import { Stack } from '#primitives/layout/stack';
import type { PluginProps } from './plugin-control-types';

const aliases = new Map([
  ['VirtualList', 'plain'],
  ['GroupedList', 'grouped'],
]);

// Legacy aliases lower to List and ListItem while retaining their wire addresses.
export function legacyNode(node: WireNode): WireNode {
  const appearance = aliases.get(node.type);

  if (appearance) return { ...node, type: 'List', props: { appearance } };

  return legacyItem(node);
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

  return {
    leading: slots.leading,
    trailing: slots.accessories,
    meta: legacyMeta(slots),
  };
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
