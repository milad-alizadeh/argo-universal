import {
  FetchReply,
  ProcessResult,
  StorageResult,
  type PluginQuery,
} from '@repo/contracts/plugins/argo-calls';
import type { QueryResults } from '@repo/contracts/plugins/query-results';
import type { WireJson } from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import { fetchResponse } from './fetch-response';

type QueryValue = QueryResults[PluginQuery['api']];

// One reader per Query api, answering with what `QueryResult` promises that api returns.
type QueryReaders = {
  [Api in PluginQuery['api']]: (data: WireJson) => QueryResults[Api];
};

const readers: QueryReaders = {
  fetch: (data) => fetchResponse(FetchReply.parse(data)),
  process: (data) => ProcessResult.parse(data),
  storage: (data) => z.array(StorageResult).parse(data),
};

export function queryResult(
  api: PluginQuery['api'] | undefined,
  data: WireJson | undefined,
): QueryValue | undefined {
  if (api === undefined) return;

  if (data === undefined) return;

  return readers[api](data);
}
