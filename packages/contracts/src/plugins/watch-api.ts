import type { PluginQuery } from './argo-calls';
import type { PluginRenderContext } from './kit';
import type { QueryResult } from './query-results';
import type { WireJson } from './wire-json';

/*
 * A Watch (ADR-0055), as `argo.watch.define(path, watch)` takes it: a plain function Argo runs for each
 * Project on the interval the manifest's `contributes.watch` declares, with no App open. Unlike a
 * Loader it may act: it reads Queries and runs its own Plugin's Operations, within the Capabilities the
 * manifest declares. What it throws is logged, and the next run still happens.
 */
export type WatchInput = Readonly<{
  // The Project the run is for.
  context: PluginRenderContext;
  read: <Query extends PluginQuery>(
    query: Query,
  ) => Promise<QueryResult<Query>>;
  // Runs one of the Plugin's own registered Operations for the Project and answers its result.
  run: (
    name: string,
    params?: Record<string, string | number | boolean>,
  ) => Promise<WireJson>;
}>;

export type Watch = (input: WatchInput) => void | Promise<void>;

export type WatchApi = Readonly<{
  define: (path: string, watch: Watch) => void;
}>;
