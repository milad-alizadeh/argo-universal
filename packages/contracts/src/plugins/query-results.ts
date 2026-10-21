import type { FetchResponse } from './argo-api';
import type { PluginQuery, ProcessResult, StorageResult } from './argo-calls';

// What each Query api answers with. The Engine's readers and the kit's `useData` type both come from here.
export type QueryResults = {
  fetch: FetchResponse;
  process: ProcessResult;
  storage: StorageResult[];
};

export type QueryResult<Query extends PluginQuery> = QueryResults[Query['api']];
