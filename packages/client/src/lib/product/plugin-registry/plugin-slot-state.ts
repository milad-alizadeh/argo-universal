import type { SlotMessage } from '@repo/contracts/plugins/wire';
import {
  emptyPluginView,
  reducePluginView,
  type PluginViewState,
} from './plugin-view-state';

interface SlotContribution {
  pluginId: string;
  // Where the contribution's events go; null until its first view arrives.
  path: string | null;
  view: PluginViewState;
}

export type PluginSlotState = readonly SlotContribution[];

export const emptyPluginSlot: PluginSlotState = [];

type View = Extract<SlotMessage, { type: 'view' }>;

// A reconnect lists the contributors again; one already drawn keeps its tree until its fresh snapshot.
function listed(
  state: PluginSlotState,
  pluginIds: readonly string[],
): PluginSlotState {
  return pluginIds.map(
    (pluginId) =>
      state.find((contribution) => contribution.pluginId === pluginId) ?? {
        pluginId,
        path: null,
        view: emptyPluginView,
      },
  );
}

function viewed(state: PluginSlotState, message: View): PluginSlotState {
  return state.map((contribution) =>
    contribution.pluginId === message.pluginId
      ? {
          pluginId: contribution.pluginId,
          path: message.path,
          view: reducePluginView(contribution.view, message.message),
        }
      : contribution,
  );
}

// The Slot's contributions in the Server's order, each drawn from its own snapshot and patches.
export function reducePluginSlot(
  state: PluginSlotState,
  message: SlotMessage,
): PluginSlotState {
  return message.type === 'contributors'
    ? listed(state, message.pluginIds)
    : viewed(state, message);
}
