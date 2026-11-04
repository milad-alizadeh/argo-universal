import {
  PluginDataState,
  ProcessResult,
  type PluginQuery,
} from '@repo/contracts/plugins/argo-calls';
import { productName } from '@repo/contracts/product-identity';
import type { PluginReply } from '../protocol/runtime';
import type { StateRequest } from '../services/plugin-calls';
import type { NamedReads } from './named-reads';
import type { QueryOwner, QueryServices } from './query-types';

type Described = Exclude<PluginQuery, { api: 'read' }>;

function requestOf(query: Described): StateRequest {
  if (query.api === 'storage') return query;

  if (query.api === 'fetch') return { api: 'fetch', call: query };

  return processRequest(query);
}

// Naming the member keeps the last branch honest: a new Query api lands here as a type error, not as a process call.
const processRequest = (
  query: Extract<PluginQuery, { api: 'process' }>,
): StateRequest => ({ api: 'process', call: query });

// What reading needs: the services a described Query calls, and the worker a named read runs in.
export type QueryReaders = Pick<QueryServices, 'during' | 'services'> & {
  reads: NamedReads;
};

// A described Query is Argo's call; a named read is the Plugin's, run for the draw that asked, if any.
function ask(
  { pluginId, generation, projectId, query }: QueryOwner,
  readers: QueryReaders,
  draw: number | undefined,
): Promise<PluginReply> {
  if (query.api === 'read') {
    const { name, args } = query;

    return readers.reads.run(pluginId, { name, args, projectId, draw });
  }

  return readers.services.handle(pluginId, generation, {
    ...requestOf(query),
    query: true,
    projectId,
  });
}

export async function readQuery(
  owner: QueryOwner,
  readers: QueryReaders,
  draw?: number,
): Promise<PluginReply> {
  const reply = await readers.during(() => ask(owner, readers, draw));

  if (timedOut(owner.query, reply))
    return { ok: false, error: `${productName} Query timed out` };

  return reply;
}

const timedOut = (query: PluginQuery, reply: PluginReply): boolean =>
  timeouts[query.api](reply);

const neverTimesOut = (): boolean => false;

// Each Query api says how its reply reports a timeout, so a new api has to answer here.
const timeouts: Record<PluginQuery['api'], (reply: PluginReply) => boolean> = {
  fetch: neverTimesOut,
  process: processTimedOut,
  storage: neverTimesOut,
  read: neverTimesOut,
};

function processTimedOut(reply: PluginReply): boolean {
  if (!reply.ok) return false;

  return ProcessResult.parse(reply.value).timedOut;
}

export function queryState(
  previous: PluginDataState,
  reply: PluginReply,
): PluginDataState {
  if (!reply.ok) return { ...previous, error: reply.error, stale: false };

  return PluginDataState.parse({
    // A round trip through JSON drops what the wire cannot carry, which the schema would reject outright.
    data: JSON.parse(JSON.stringify(reply.value ?? null)),
    stale: false,
    revision: previous.revision,
  });
}
