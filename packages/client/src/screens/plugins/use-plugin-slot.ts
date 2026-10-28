import type { PluginSlotInput } from '@repo/contracts/plugins/wire';
import {
  emptyPluginSlot,
  reducePluginSlot,
  type PluginSlotContribution,
  type PluginSlotState,
  type ContributedView,
} from '../../lib/product/plugin-registry';
import { usePluginBinding, type PluginBinding } from './use-plugin-binding';
import { type PluginNameLookup, usePluginNames } from './use-plugin-names';
import { usePluginStream } from './use-plugin-stream';

type Wiring = {
  nameOf: PluginNameLookup;
  bind: (drawn: ContributedView) => PluginBinding;
};

// Watches a core page's Slot on the connected Server: each declaring Plugin's contribution, drawn once it has a tree.
export function usePluginSlot(slot: PluginSlotInput): PluginSlotContribution[] {
  const { state } = usePluginStream(
    slot,
    (trpc, input, onData) =>
      trpc.plugins.slot.subscriptionOptions(input, { onData }),
    { initial: emptyPluginSlot, reduce: reducePluginSlot },
  );

  return drawn(state, { nameOf: usePluginNames(), bind: usePluginBinding() });
}

// Only a contribution with a tree is drawn.
const drawn = (
  state: PluginSlotState,
  { nameOf, bind }: Wiring,
): PluginSlotContribution[] =>
  state.flatMap(({ pluginId, path, view }) => {
    if (!view.root || !path) return [];

    const { root, viewId } = view;
    const name = nameOf(pluginId);

    return [
      { pluginId, name, root, viewId, ...bind({ pluginId, path, view }) },
    ];
  });
