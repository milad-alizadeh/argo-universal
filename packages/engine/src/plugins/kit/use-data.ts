import {
  serialisePluginQuery,
  type PluginQuery,
  type PluginDataState,
} from '@repo/contracts/plugins/argo-calls';
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

type QueryData = Pick<PluginDataState, 'error' | 'stale'> & {
  data: ReturnType<typeof queryResult>;
  refresh: () => Promise<void>;
};

export type KitDataClient = {
  ready: PluginDataClient['ready'];
  receive: PluginDataClient['receive'];
  useData: (
    query: PluginQuery | null,
    options?: { every?: number },
  ) => QueryData;
};

export function dataClient(call: DataCall): KitDataClient {
  const client = new PluginDataClient(call);

  return {
    ready: (viewId) => client.ready(viewId),
    receive: (event) => client.receive(event),
    useData: (query, options) => useQueryData(client, query, options),
  };
}

export function useQueryData(
  client: PluginDataClient,
  query: PluginQuery | null,
  { every }: { every?: number } = {},
): QueryData {
  const target = useTarget(client, query, every);
  const state = useSubscription(client, target);

  const refresh = useCallback(() => client.refresh(target), [client, target]);

  return {
    data: useResult(query, state.data),
    error: state.error,
    stale: state.stale,
    refresh,
  };
}

function useResult(
  query: PluginQuery | null,
  data: PluginDataState['data'],
): QueryData['data'] {
  const api = query?.api;

  return useMemo(() => queryResult(api, data), [api, data]);
}

function useTarget(
  client: PluginDataClient,
  query: PluginQuery | null,
  every: number | undefined,
): DataTarget {
  const viewId = useContext(QueryViewContext);
  const identity = query === null ? null : serialisePluginQuery(query);

  return useMemo(
    () => ({ viewId, watchId: client.nextId(), identity, every }),
    [client, viewId, identity, every],
  );
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
