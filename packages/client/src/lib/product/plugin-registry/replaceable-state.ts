import type {
  ReplaceableInput,
  ReplaceableMessage,
} from '@repo/contracts/plugins/replaceable';
import {
  emptyPluginView,
  reducePluginView,
  type PluginViewState,
} from './plugin-view-state';

export type ReplaceableState = {
  input: ReplaceableInput;
  replacement: { pluginId: string; path: string; view: PluginViewState } | null;
};

export const coreSlotState = (input: ReplaceableInput): ReplaceableState => ({
  input,
  replacement: null,
});

export function reduceReplaceable(
  state: ReplaceableState,
  message: ReplaceableMessage,
): ReplaceableState {
  if (message.type === 'core') return coreSlotState(message.input);

  return {
    ...state,
    replacement: {
      pluginId: message.pluginId,
      path: message.path,
      view: reducePluginView(previousView(state), message.message),
    },
  };
}

const previousView = (state: ReplaceableState): PluginViewState =>
  state.replacement?.view ?? emptyPluginView;
