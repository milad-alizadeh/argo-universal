import type { PluginSlotInput, WireNode } from '@repo/contracts/plugins/wire';
import { useQuery } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useReducer } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import {
  emptyPluginSlot,
  reducePluginSlot,
  type PluginSlotContribution,
  type PluginSlotState,
} from '../../lib/product/plugin-registry';
import { usePluginDispatch, type PluginDispatch } from './use-plugin-dispatch';

type NameOf = (pluginId: string) => string;

// Each Plugin's name from the connected Server's list; the id until the list arrives.
function useNames(): NameOf {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.plugins.list.queryOptions());

  const names = new Map(
    (data?.plugins ?? []).map(({ manifest }) => [manifest.id, manifest.name]),
  );

  return (pluginId) => names.get(pluginId) ?? pluginId;
}

type Drawn = { pluginId: string; path: string; root: WireNode };

const contribution = (
  { pluginId, path, root }: Drawn,
  nameOf: NameOf,
  send: PluginDispatch,
): PluginSlotContribution => ({
  pluginId,
  name: nameOf(pluginId),
  root,
  onEvent: (eventId) => send(pluginId, path, eventId),
});

// Only a contribution with a tree is drawn.
const drawn = (
  state: PluginSlotState,
  nameOf: NameOf,
  send: PluginDispatch,
): PluginSlotContribution[] =>
  state.flatMap(({ pluginId, path, view }) =>
    view.root && path
      ? [contribution({ pluginId, path, root: view.root }, nameOf, send)]
      : [],
  );

// Watches a core page's Slot on the connected Server: each declaring Plugin's contribution, drawn once it has a tree.
export function usePluginSlot(slot: PluginSlotInput): PluginSlotContribution[] {
  const trpc = useTRPC();
  const [state, receive] = useReducer(reducePluginSlot, emptyPluginSlot);

  const subscription = useSubscription(
    trpc.plugins.slot.subscriptionOptions(slot, { onData: receive }),
  );

  useResubscribeOnReconnect(subscription);

  return drawn(state, useNames(), usePluginDispatch());
}
