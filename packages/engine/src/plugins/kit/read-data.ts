import type {
  ReadDataOptions,
  ReadDataResult,
} from '@repo/contracts/plugins/argo-api';
import type { PluginQuery } from '@repo/contracts/plugins/argo-calls';
import type { DataCall } from './data-subscription';
import { queryResult } from './query-result';

// `argo.data.read`: one answer from the Query's entry, for code with no view to watch it from.
export function readQueryData<Query extends PluginQuery>(
  call: DataCall,
  query: Query,
  options: ReadDataOptions,
): Promise<ReadDataResult<Query>>;
export async function readQueryData(
  call: DataCall,
  query: PluginQuery,
  { every, projectId }: ReadDataOptions,
): Promise<ReadDataResult<PluginQuery>> {
  const { data, error, errorKind } = await call({
    api: 'data',
    action: 'read',
    query,
    every,
    projectId,
  });

  return { data: queryResult(query.api, data), error, errorKind };
}
