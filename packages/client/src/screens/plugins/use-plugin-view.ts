import type { PluginViewInput } from '@repo/contracts/plugins/wire';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  emptyPluginView,
  reducePluginView,
  type PluginViewState,
  type PluginOnEvent,
} from '../../lib/product/plugin-registry';
import { HeldEvents } from './held-events';
import { keepPluginTree, useKeptPluginTree } from './plugin-page-trees';
import { usePluginBinding } from './use-plugin-binding';
import { usePluginStream } from './use-plugin-stream';

export interface PluginView extends PluginViewState {
  dispatch: PluginOnEvent;
  // Changes when one live view replaces another, such as after a Plugin reload: a new tree, with no drafts from the old.
  treeKey: number;
}

/*
 * Watches one Plugin page on the connected Server, for a Session when it opened for one; its events dispatch to the
 * view they came from. A view that is not `live` is closed on the Server. Until a view is open the page draws the last
 * tree it kept (ADR-0048), and the view's first snapshot replaces that tree in place, so nothing remounts.
 */
export function usePluginView(input: PluginViewInput, live = true): PluginView {
  const page = useSamePage(input);
  const kept = useKeptPluginTree(page);
  const state = usePluginViewStream(page, live, kept);

  useKeepTree(page, state);

  const { onEvent } = usePluginBinding()({ ...page, view: state });
  const drawn = state.viewId ? state : { ...state, root: kept };

  return {
    ...drawn,
    dispatch: useHeldUntilLive({ page, live, drawn, onEvent }),
    treeKey: useLiveViewCount(state.viewId),
  };
}

// Callers build the page anew each render; effects follow which page it is.
function useSamePage(page: PluginViewInput): PluginViewInput {
  const [same, setSame] = useState(page);
  const changed = JSON.stringify(page) !== JSON.stringify(same);

  if (changed) setSame(page);

  return changed ? page : same;
}

function usePluginViewStream(
  page: PluginViewInput,
  live: boolean,
  kept: PluginViewState['root'],
): PluginViewState {
  return usePluginStream(
    { page, live },
    (trpc, input, onData) =>
      trpc.plugins.view.subscriptionOptions(input.page, {
        onData,
        enabled: input.live,
      }),
    { initial: { ...emptyPluginView, root: kept }, reduce: reducePluginView },
  ).state;
}

// Only what a live view drew is kept, so an entry dropped under a live page stays dropped until the page changes.
function useKeepTree(page: PluginViewInput, state: PluginViewState): void {
  const client = useQueryClient();
  const { root, viewId } = state;
  const liveTree = viewId ? root : null;

  useEffect(() => {
    if (liveTree) keepPluginTree(client, page, liveTree);
  }, [client, page, liveTree]);
}

interface HoldingInput {
  page: PluginViewInput;
  live: boolean;
  drawn: PluginViewState;
  onEvent: PluginOnEvent;
}

// A tap on a tree with no view behind it waits for the view; the choice and its reasons are in ADR-0048.
function useHeldUntilLive(input: HoldingInput): PluginOnEvent {
  const { page, live, drawn, onEvent } = input;
  const { root, viewId } = drawn;
  const [held] = useState(() => new HeldEvents());

  useEffect(() => {
    if (viewId && root) held.release(root, onEvent);
  }, [held, viewId, root, onEvent]);

  useEffect(() => {
    if (!live) held.drop();
  }, [held, live]);

  useEffect(() => (): void => held.drop(), [held, page]);

  if (viewId || !root) return onEvent;

  return (nodeKey, event) => held.hold(root, nodeKey, event);
}

type ViewId = PluginViewState['viewId'];

const replacesView = (last: ViewId, next: ViewId): boolean =>
  Boolean(last && next && last !== next);

// A tree outlives the step from kept to live and a view closing, and starts over only when a view is replaced by another.
function useLiveViewCount(viewId: ViewId): number {
  const [seen, setSeen] = useState({ viewId, count: 0 });
  const count = seen.count + Number(replacesView(seen.viewId, viewId));

  if (viewId !== seen.viewId) setSeen({ viewId, count });

  return count;
}
