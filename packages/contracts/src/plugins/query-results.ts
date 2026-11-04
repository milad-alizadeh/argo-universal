import type { FetchResponse } from './argo-api';
import type { PluginQuery, ProcessResult, StorageResult } from './argo-calls';
import type { CrossesAsJson, WireJson } from './wire-json';

// What each Query api answers with. The Engine's readers and the kit's `useData` type both come from here.
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
    ? unknown extends Value
      ? QueryResults[Query['api']]
      : Value
    : QueryResults[Query['api']];

// What a named read is given besides its args: the Project its Query is for, when it is for one.
export type QueryReadContext = Readonly<{ projectId?: string }>;

/*
 * `argo.queries.define(name, read)` (ADR-0037): a read the Plugin runs and Argo keeps, as it keeps a
 * described Query. Its answer is the Plugin's own JSON, so its type must be JSON all through: a `Date` fails
 * type-checking. It is keyed by the Plugin, the Project and the name with its args, so a Loader, a `useData`
 * and a background pass naming the same args share one entry, and a write makes it due. Argo may run it again
 * whenever it likes, so it must only read, and only from its args and context.
 */
export type QueriesApi = Readonly<{
  define: <Args extends WireJson, Value extends CrossesAsJson<Value>>(
    name: string,
    read: (args: Args, context: QueryReadContext) => Value | Promise<Value>,
  ) => (args: Args) => NamedQuery<Value>;
}>;
