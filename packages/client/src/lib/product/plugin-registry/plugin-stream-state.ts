import type {
  ReplaceableInput,
  ReplaceableMessage,
} from '@repo/contracts/plugins/replaceable';
import type {
  SlotMessage,
  ViewMessage,
  WireNode,
  PluginViewId,
} from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';

// What each Plugin stream draws: a page's view, a Slot's contributions, or a Replaceable Slot's replacement.

export interface PluginViewState {
  root: WireNode | null;
  revision: number;
  viewId: PluginViewId | null;
}

export const emptyPluginView: PluginViewState = {
  root: null,
  revision: 0,
  viewId: null,
};

type Snapshot = Extract<ViewMessage, { type: 'snapshot' }>;

type Patch = Extract<ViewMessage, { type: 'patch' }>;

export function reducePluginView(
  state: PluginViewState,
  message: ViewMessage,
): PluginViewState {
  return message.type === 'snapshot'
    ? snapshot(message)
    : patched(state, message);
}

function snapshot({ root, revision, viewId }: Snapshot): PluginViewState {
  return { root, revision, viewId: viewId ?? null };
}

function patched(
  state: PluginViewState,
  { revision, ops }: Patch,
): PluginViewState {
  if (!state.root || revision <= state.revision) return state;

  return { ...state, root: applyPatch(state.root, ops), revision };
}

// One Plugin's view in a Slot or Replaceable Slot, and the path its events dispatch to.
export interface ContributedView<Path = string> {
  pluginId: string;
  path: Path;
  view: PluginViewState;
}

type ContributionMessage = {
  pluginId: string;
  path: string;
  message: ViewMessage;
};

const contributed = (
  view: PluginViewState,
  { pluginId, path, message }: ContributionMessage,
): ContributedView => ({
  pluginId,
  path,
  view: reducePluginView(view, message),
});

export type PluginSlotState = readonly ContributedView<string | null>[];

export const emptyPluginSlot: PluginSlotState = [];

export function reducePluginSlot(
  state: PluginSlotState,
  message: SlotMessage,
): PluginSlotState {
  if (message.type === 'contributors')
    return message.pluginIds.map((pluginId) => listed(state, pluginId));

  return state.map((contribution) =>
    contribution.pluginId === message.pluginId
      ? contributed(contribution.view, message)
      : contribution,
  );
}

// A contributor keeps what it drew when the Server lists it again; a new one is blank until its snapshot.
function listed(
  state: PluginSlotState,
  pluginId: string,
): ContributedView<string | null> {
  return (
    state.find((contribution) => contribution.pluginId === pluginId) ?? {
      pluginId,
      path: null,
      view: emptyPluginView,
    }
  );
}

export type ReplaceableState = {
  input: ReplaceableInput;
  replacement: ContributedView | null;
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

  return { ...state, replacement: contributed(previousView(state), message) };
}

const previousView = (state: ReplaceableState): PluginViewState =>
  state.replacement?.view ?? emptyPluginView;
