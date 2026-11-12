import type { FetchResponse } from './argo-api';
import type { PluginQuery, ProcessResult, StorageResult } from './argo-calls';
import type { CrossesAsJson, WireJson } from './wire-json';

// What each Query api answers with. The Engine's readers and a Loader's `read` type both come from here.
export type QueryResults = {
  fetch: FetchResponse;
  process: ProcessResult;
  storage: StorageResult[];
  read: WireJson;
};

declare const answers: unique symbol;

// A named read with its args, as `argo.queries.define` makes it: it carries the type its read answers with.
export type NamedQuery<Value> = Extract<PluginQuery, { api: 'read' }> & {
  readonly [answers]?: Value;
};

// A named read answers what its read does; any other Query, a bare named read included, what its api does.
export type QueryResult<Query extends PluginQuery> =
  Query extends NamedQuery<infer Value>
    ? NamedAnswer<Value, QueryResults[Query['api']]>
    : QueryResults[Query['api']];

// A bare named read names no answer type, so it answers what its api does.
type NamedAnswer<Value, ApiAnswer> = unknown extends Value ? ApiAnswer : Value;

// What a named read is given besides its args: the Project its Query is for, when it is for one.
export type QueryReadContext = Readonly<{ projectId?: string }>;

/*
 * `argo.queries.define(name, read)` (ADR-0037): a read the Plugin runs and Argo keeps, as it keeps a
 * described Query. Its answer is the Plugin's own JSON, so its type must be JSON all through: a `Date` fails
 * type-checking. It is keyed by the Plugin, the Project and the name with its args, so two Loaders
 * and a background pass naming the same args share one entry, and a write makes it due. Argo may run it again
 * whenever it likes, so it must only read, and only from its args and context.
 */
export type QueriesApi = Readonly<{
  define: <Args extends WireJson, Value extends CrossesAsJson<Value>>(
    name: string,
    read: (args: Args, context: QueryReadContext) => Value | Promise<Value>,
    options?: { projectOf?: (args: Args) => string | undefined },
  ) => (args: Args) => NamedQuery<Value>;
  /*
   * Reads a named Query from code that runs outside a draw, such as a Slot's provider, through the entry a
   * page's Loader reads: the answer Argo keeps unless a write made it due, so a Slot and a page asking the
   * same question make one read. `projectId` names the Project the Query is for; leave it out to share the
   * entry of a page that has none. It throws when the Query has no answer yet.
   */
  read: <Value>(
    query: NamedQuery<Value>,
    options?: { projectId?: string },
  ) => Promise<QueryResult<NamedQuery<Value>>>;
  /*
   * Keeps `value` as the answer of another named Query. Argo cannot check it against a shape, as a named read's
   * answer is the Plugin's own JSON, so the Plugin keeps the two reads in step. A write, or `argo.changed()`, that
   * lands while the seeding read is in flight drops the seed, so it never revives an answer a write made stale.
   * It keeps `value` for the Project of the read that calls it, as if it
   * had just been read. Call it from a named read that already holds the answer.
   */
  seed: <Value extends CrossesAsJson<Value>>(
    query: NamedQuery<Value>,
    value: Value,
  ) => Promise<void>;
}>;
