import {
  pagedListRead,
  QueryReadName,
} from '@repo/contracts/plugins/argo-calls';
import type { QueryReadAnswer } from '@repo/contracts/plugins/page-address';
import type {
  QueriesApi,
  QueryReadContext,
} from '@repo/contracts/plugins/query-results';
import {
  wireJsonOf,
  type PluginEvent,
  type WireJson,
} from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import { runtimeError } from '../protocol/runtime-status';
import { swallowed } from './swallowed';

export type QueryReadSend = (answer: QueryReadAnswer) => Promise<void>;

type ReadEvent = Extract<PluginEvent, { type: 'read' }>;

// A defined read as Argo runs it: its args and context in, its answer as JSON out.
type Read = (args: WireJson, context: QueryReadContext) => Promise<WireJson>;

// One page of a paged list, read from its cursor by the draw still running: the Plugin's own `ListPage`.
type ListRead = (cursor: string | null) => object | Promise<object>;

// The paged list a draw still running reads its pages with, by the draw's id.
export type DrawLists = Map<number, ListRead>;

export interface QueryReads {
  api: Pick<QueriesApi, 'define'>;
  answer: (event: ReadEvent) => void;
}

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

  return async (args, context) => wireJsonOf(await named.run(args, context));
}

function run(
  defined: Map<string, Read>,
  lists: DrawLists,
  { name, args, projectId, draw }: ReadEvent,
): Promise<WireJson> {
  if (name === pagedListRead) return listPage(lists, draw, args);

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

  return wireJsonOf(await list(ListArgs.parse(args).cursor));
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
      send({ action: 'failed', id, error: runtimeError(cause) }),
    )
    .catch(swallowed);
