import type { SlotMessage } from '@repo/contracts/plugins/wire';
import {
  emptyPluginView,
  reducePluginView,
  type PluginViewState,
} from './plugin-view-state';

interface SlotContribution {
  pluginId: string;
  path: string | null;
  view: PluginViewState;
}

export type PluginSlotState = readonly SlotContribution[];

export const emptyPluginSlot: PluginSlotState = [];

export function reducePluginSlot(
  state: PluginSlotState,
  message: SlotMessage,
): PluginSlotState {
  if (message.type === 'contributors')
    return message.pluginIds.map((pluginId) => listed(state, pluginId));

  return state.map((contribution) =>
    contribution.pluginId === message.pluginId
      ? viewed(contribution, message)
      : contribution,
  );
}

function viewed(
  contribution: SlotContribution,
  message: Extract<SlotMessage, { type: 'view' }>,
): SlotContribution {
  const { pluginId, path } = message;
  const view = reducePluginView(contribution.view, message.message);

  return { pluginId, path, view };
}

function listed(state: PluginSlotState, pluginId: string): SlotContribution {
  return (
    state.find((contribution) => contribution.pluginId === pluginId) ?? {
      pluginId,
      path: null,
      view: emptyPluginView,
    }
  );
}
