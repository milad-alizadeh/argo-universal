import type { PluginInteraction, WireJson } from '@repo/contracts/plugins/wire';

export interface PluginNodeUiState {
  searchText?: string;
  selection?: string[];
  scroll?: { x: number; y: number };
  open?: boolean;
  draft?: WireJson;
  focused?: boolean;
}

export type PluginUiState = ReadonlyMap<string, PluginNodeUiState>;

export interface PluginUiChange {
  key: string;
  value: PluginNodeUiState;
}

export function reducePluginUi(
  state: PluginUiState,
  { key, value }: PluginUiChange,
): PluginUiState {
  return new Map(state).set(key, { ...state.get(key), ...value });
}

export function interactionUi(
  interaction: PluginInteraction,
): PluginNodeUiState | null {
  switch (interaction.event) {
    case 'onSearchTextChange':
      return { searchText: interaction.payload };
    case 'onSelectionChange':
      return { selection: interaction.payload };

    default:
      return draftUi(interaction);
  }
}

function draftUi(interaction: PluginInteraction): PluginNodeUiState | null {
  return interaction.event === 'onChangeText'
    ? { draft: interaction.payload }
    : null;
}
