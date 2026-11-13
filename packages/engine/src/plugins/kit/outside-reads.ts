import type { PluginQuery } from '@repo/contracts/plugins/argo-calls';
import type {
  NamedQuery,
  QueriesApi,
  QueryResult,
  QueryState,
} from '@repo/contracts/plugins/query-results';
import { wireJsonOf } from '@repo/contracts/plugins/wire';
import type { DataCall } from './draw-reads';
import { queryResult } from './query-result';

type Reads = Pick<QueriesApi, 'read' | 'readState' | 'seed'>;

async function readNamed<Value>(
  call: DataCall,
  query: NamedQuery<Value>,
  projectId?: string,
): Promise<QueryResult<NamedQuery<Value>>>;
async function readNamed(
  call: DataCall,
  query: PluginQuery,
  projectId?: string,
): Promise<QueryResult<PluginQuery>> {
  const state = await call({
    api: 'data',
    action: 'read',
    query,
    projectId,
  });

  if (state.data === undefined)
    throw new Error(state.error ?? 'The Query answered nothing');

  return queryResult(query.api, state.data);
}

// What Argo keeps for the Query, a failure included: the last good answer, if there is one, and why the latest read failed.
async function stateNamed<Value>(
  call: DataCall,
  query: NamedQuery<Value>,
  projectId?: string,
): Promise<QueryState<Value>>;
async function stateNamed(
  call: DataCall,
  query: PluginQuery,
  projectId?: string,
): Promise<{
  data?: QueryResult<PluginQuery>;
  error?: string;
  stale: boolean;
}> {
  const { data, error, stale } = await call({
    api: 'data',
    action: 'read',
    query,
    projectId,
  });

  return {
    stale,
    ...(data !== undefined && { data: queryResult(query.api, data) }),
    ...(error !== undefined && { error }),
  };
}

/*
 * A named Query read, or seeded, from code that runs outside a draw: Argo answers it from the entry a page's
 * Loader reads, so a Slot and a page asking the same question make one read (ADR-0037, ADR-0050).
 */
export const outsideReads = (call: DataCall): Reads => ({
  read: (query, options) => readNamed(call, query, options?.projectId),
  readState: (query, options) => stateNamed(call, query, options?.projectId),
  seed: async (query, value) => {
    await call({
      api: 'data',
      action: 'seed',
      query,
      value: wireJsonOf(value),
    });
  },
});
