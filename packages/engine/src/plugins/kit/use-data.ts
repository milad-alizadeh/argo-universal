import type { UseData, UseDataResult } from '@repo/contracts/plugins/argo-api';
import {
  serialisePluginQuery,
  type PluginQuery,
  type PluginDataState,
} from '@repo/contracts/plugins/argo-calls';
import type { QueryResult } from '@repo/contracts/plugins/query-results';
import type { PluginViewId } from '@repo/contracts/plugins/wire';
import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { PluginDataClient } from './data-client';
import {
  emptyData,
  type DataCall,
  type DataTarget,
  type DataSnapshot,
} from './data-subscription';
import { queryResult } from './query-result';

export const QueryViewContext = createContext<PluginViewId | null>(null);

export type KitDataClient = {
  ready: PluginDataClient['ready'];
  receive: PluginDataClient['receive'];
  useData: UseData;
};

export function dataClient(call: DataCall): KitDataClient {
  const client = new PluginDataClient(call);

  return {
    ready: (viewId, background) => client.ready(viewId, background),
    receive: (event) => client.receive(event),
    useData: (query, options) => useQueryData(client, query, options),
  };
}

// A Query's api decides what its answer is (`QueryResult`); the readers behind `useResult` answer with that.
export function useQueryData<Query extends PluginQuery>(
  client: PluginDataClient,
  query: Query | null,
  options?: { every?: number },
): UseDataResult<Query>;
export function useQueryData(
  client: PluginDataClient,
  query: PluginQuery | null,
  { every }: { every?: number } = {},
): UseDataResult<PluginQuery> {
  const { target, error } = useTarget(client, query, every);
  const state = useSubscription(client, target);

  const refresh = useCallback(() => client.refresh(target), [client, target]);

  return {
    data: useResult(query, state.data),
    error: error ?? state.error,
    stale: state.stale,
    refresh,
  };
}

type QueryIdentity = { identity: string | null; error: string | undefined };

type QueryTarget = { target: DataTarget; error: string | undefined };

/*
 * A Query with no normal form is a Query Argo cannot ask at all, which is what `error` reports
 * (ADR-0037). The Engine already answers its own serialiser that way; a throw here would instead
 * take down the page that asked, which the Plugin cannot read.
 */
function identityOf(query: PluginQuery | null): QueryIdentity {
  if (query === null) return { identity: null, error: undefined };

  try {
    return { identity: serialisePluginQuery(query), error: undefined };
  } catch (cause) {
    return { identity: null, error: refusal(cause) };
  }
}

const refusal = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

function useResult(
  query: PluginQuery | null,
  data: PluginDataState['data'],
): QueryResult<PluginQuery> | undefined {
  const api = query?.api;

  return useMemo(() => queryResult(api, data), [api, data]);
}

function useTarget(
  client: PluginDataClient,
  query: PluginQuery | null,
  every: number | undefined,
): QueryTarget {
  const viewId = useContext(QueryViewContext);
  const { identity, error } = identityOf(query);

  const target = useMemo(
    () => ({ viewId, watchId: client.nextId(), identity, every }),
    [client, viewId, identity, every],
  );

  return { target, error };
}

function useSubscription(
  client: PluginDataClient,
  target: DataTarget,
): PluginDataState {
  const { snapshot, changed } = useSnapshot(target.watchId);

  client.seen(target.watchId, snapshot.version);
  useLayoutEffect(
    () => client.subscribe(target, changed),
    [client, target, changed],
  );

  return snapshot.state;
}

type ObservedData = {
  snapshot: DataSnapshot;
  changed: (snapshot: DataSnapshot) => void;
};

function useSnapshot(watchId: string): ObservedData {
  const [watched, setWatched] = useState({ watchId, snapshot: emptyData });

  const changed = useCallback(
    (snapshot: DataSnapshot) => setWatched({ watchId, snapshot }),
    [watchId],
  );

  return {
    snapshot: watched.watchId === watchId ? watched.snapshot : emptyData,
    changed,
  };
}
