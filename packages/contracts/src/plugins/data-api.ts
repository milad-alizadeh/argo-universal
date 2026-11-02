import type { PluginErrorKind, PluginQuery } from './argo-calls';
import type { QueryResult } from './query-results';

// What `useData` hands a page for its Query, and the hook itself: the Engine's kit implements it, `@argo/plugin-kit` declares it.
export type UseDataResult<Query extends PluginQuery> = {
  data: QueryResult<Query> | undefined;
  error: string | undefined;
  // Set exactly when `error` is, and says why it is.
  errorKind: PluginErrorKind | undefined;
  stale: boolean;
  refresh: () => Promise<void>;
};

// `projectId` names the Project the Query reads for, such as a Project the page lists; it defaults to the view's.
export type UseDataOptions = { every?: number; projectId?: string };

export type UseData = <Query extends PluginQuery>(
  query: Query | null,
  options?: UseDataOptions,
) => UseDataResult<Query>;

// `every` is how old an answer may be and still be used. A read has no clock of its own: it runs only when asked.
export type ReadDataOptions = { every: number; projectId?: string };

export type ReadDataResult<Query extends PluginQuery> = Pick<
  UseDataResult<Query>,
  'data' | 'error' | 'errorKind'
>;

export type ReadData = <Query extends PluginQuery>(
  query: Query,
  options: ReadDataOptions,
) => Promise<ReadDataResult<Query>>;
