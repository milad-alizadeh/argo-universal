import {
  QueryReadName,
  type PluginDataRequest,
  type PluginDataState,
  type PluginQuery,
} from '@repo/contracts/plugins/argo-calls';
import type {
  PageState,
  QueryReadAnswer,
} from '@repo/contracts/plugins/page-address';
import type {
  QueriesApi,
  QueryReadContext,
  QueryResult,
} from '@repo/contracts/plugins/query-results';
import type { PluginEvent, WireJson } from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import type { ReadPage } from './paged-lists';
import { queryResult } from './query-result';

// The worker's read of one Query through the Server's cache (ADR-0037).
export type DataCall = (request: PluginDataRequest) => Promise<PluginDataState>;

export type QueryReadSend = (answer: QueryReadAnswer) => Promise<void>;

type ReadEvent = Extract<PluginEvent, { type: 'read' }>;

// A defined read as Argo runs it: its args and context in, its answer as JSON out.
type Read = (args: WireJson, context: QueryReadContext) => Promise<WireJson>;

// One page of a paged list, read from its cursor by the draw still running: the Plugin's own `ListPage`.
type ListRead = (cursor: string | null) => object | Promise<object>;

// The paged list a draw still running reads its pages with, by the draw's id.
export type DrawLists = Map<number, ListRead>;

export interface QueryReads {
  api: QueriesApi;
  answer: (event: ReadEvent) => void;
}

// Argo's own name for one page of a Loader page's paged list, which a Plugin's read can never take.
const listRead = 'argo:list';

/*
 * The named reads a Plugin defined (ADR-0037), and the reads Argo asks of them for the Queries it keeps:
 * each one answered by its id with the read's JSON, or failed with why. A page of a paged list is read by
 * the draw that asked for it.
 */
export function queryReads(send: QueryReadSend, lists: DrawLists): QueryReads {
  const defined = new Map<string, Read>();

  return {
    api: Object.freeze({ define: defining(defined) }),
    answer: (event) => void answer(send, run(defined, lists, event), event.id),
  };
}

const defining =
  (defined: Map<string, Read>): QueriesApi['define'] =>
  (name, read) => {
    if (!QueryReadName.safeParse(name).success)
      throw new Error(
        `A named read's name is letters, digits, . or -: ${name}`,
      );

    if (defined.has(name)) throw new Error(`${name} is already a named read`);

    defined.set(name, asRead(read));

    return (args) => Object.freeze({ api: 'read', name, args });
  };

type Named<Value> = {
  run(args: WireJson, context: QueryReadContext): Value | Promise<Value>;
};

/*
 * Argo hands a read back only the args its own Query named, so they are the Args it was made with; the
 * method form says so to the checker, as a method's parameters are compared both ways.
 */
function asRead<Args extends WireJson, Value>(
  read: (args: Args, context: QueryReadContext) => Value | Promise<Value>,
): Read {
  const named: Named<Value> = { run: read };

  return async (args, context) => asJson(await named.run(args, context));
}

function run(
  defined: Map<string, Read>,
  lists: DrawLists,
  { name, args, projectId, draw }: ReadEvent,
): Promise<WireJson> {
  if (name === listRead) return listPage(lists, draw, args);

  const read = defined.get(name);

  if (!read) return Promise.reject(new Error(`No named read ${name}`));

  return read(args, contextOf(projectId));
}

const contextOf = (projectId: string | undefined): QueryReadContext =>
  Object.freeze(projectId === undefined ? {} : { projectId });

const ListArgs = z.object({ cursor: z.string().nullable() });

async function listPage(
  lists: DrawLists,
  draw: number | undefined,
  args: WireJson,
): Promise<WireJson> {
  const list = draw === undefined ? undefined : lists.get(draw);

  if (!list) throw new Error('A paged list is read only during its draw');

  return asJson(await list(ListArgs.parse(args).cursor));
}

// A read that failed, or whose answer could not be sent, is answered with why.
const answer = (
  send: QueryReadSend,
  value: Promise<WireJson>,
  id: number,
): Promise<void> =>
  value
    .then((read) => send({ action: 'read', id, value: read }))
    .catch((cause: unknown) =>
      send({ action: 'failed', id, error: reasonOf(cause) }),
    )
    .catch(() => {});

const reasonOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const JsonValue = z.json();

// Only JSON crosses to Argo, so what the read answered is kept as JSON would carry it.
const asJson = <Value>(value: Value): WireJson =>
  JsonValue.parse(JSON.parse(JSON.stringify(value ?? null)));

// A Loader's reads during one draw: the answer Argo keeps for the Query, or why it has none.
export type DrawReader = <Query extends PluginQuery>(
  query: Query,
  fresh: boolean,
) => Promise<QueryResult<Query>>;

type DrawAt = { call: DataCall; draw: number };

export const drawReader =
  (call: DataCall, draw: number): DrawReader =>
  (query, fresh) =>
    readQuery({ call, draw }, query, fresh);

async function readQuery<Query extends PluginQuery>(
  at: DrawAt,
  query: Query,
  fresh: boolean,
): Promise<QueryResult<Query>>;
async function readQuery(
  { call, draw }: DrawAt,
  query: PluginQuery,
  fresh: boolean,
): Promise<QueryResult<PluginQuery> | undefined> {
  const state = await call({ api: 'data', action: 'read', draw, query, fresh });

  if (state.data === undefined)
    throw new Error(state.error ?? 'The Query answered nothing');

  return queryResult(query.api, state.data);
}

// The address a list is read at, short of its Plugin and Project, which the Query's entry already names.
type ListAt = { path: string; pageState: PageState; sessionId?: string };

// One page of the draw's paged list, kept by Argo as a Query of its address and cursor.
export function listReader<Item>(
  read: DrawReader,
  { path, pageState, sessionId }: ListAt,
): ReadPage<Item> {
  const page = z.object({
    items: z.array(z.custom<Item>()),
    cursor: z.string().nullable(),
  });

  return async (cursor, fresh) => {
    const args = { path, pageState, sessionId: sessionId ?? null, cursor };

    return page.parse(await read({ api: 'read', name: listRead, args }, fresh));
  };
}
