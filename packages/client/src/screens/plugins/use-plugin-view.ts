import type {
  PluginViewInput,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import { replaceEqualDeep, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTRPC } from '#features/connection';
import {
  emptyPluginView,
  reducePluginView,
  type PluginViewState,
  type PluginOnEvent,
} from '../../lib/product/plugin-registry';
import { useHeldUntilLive } from './held-events';
import {
  keepPluginTree,
  keptTreeKey,
  useKeptPluginTree,
} from './plugin-page-trees';
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
  const drawn = useKeptPluginView(page, live);
  const { onEvent } = usePluginBinding()({ ...page, view: drawn });

  return {
    ...drawn,
    dispatch: useHeldUntilLive({ page, live, drawn, onEvent }),
    treeKey: useLiveViewCount(drawn.viewId),
  };
}

// The live view once it is open, and until then the kept tree, which the view's first snapshot starts from.
function useKeptPluginView(
  page: PluginViewInput,
  live: boolean,
): PluginViewState {
  const state = usePluginViewStream(page, live);
  const kept = useKeptPluginTree(page, !state.viewId);

  useKeepLiveTree(page, state);

  return state.viewId ? state : { ...state, root: kept };
}

function usePluginViewStream(
  page: PluginViewInput,
  live: boolean,
): PluginViewState {
  const kept = useQueryClient().getQueryData<WireNode>(keptTreeKey(page));

  return usePluginStream({ page, live }, subscribeToView, {
    initial: { ...emptyPluginView, root: kept ?? null },
    reduce: reducePluginView,
  }).state;
}

type TRPC = ReturnType<typeof useTRPC>;

const subscribeToView = (
  trpc: TRPC,
  input: { page: PluginViewInput; live: boolean },
  onData: (message: ViewMessage) => void,
): ReturnType<TRPC['plugins']['view']['subscriptionOptions']> =>
  trpc.plugins.view.subscriptionOptions(input.page, {
    onData,
    enabled: input.live,
  });

// Only what a live view drew is kept, so an entry dropped under a live page stays dropped until the page changes.
function useKeepLiveTree(page: PluginViewInput, state: PluginViewState): void {
  const client = useQueryClient();
  const liveTree = state.viewId ? state.root : null;

  useEffect(() => {
    if (liveTree) keepPluginTree(client, page, liveTree);
  }, [client, page, liveTree]);
}

// Callers build the page anew each render; effects follow which page it is.
function useSamePage(page: PluginViewInput): PluginViewInput {
  const [same, setSame] = useState(page);
  const next = replaceEqualDeep(same, page);

  if (next !== same) setSame(next);

  return next;
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
