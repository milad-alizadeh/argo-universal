import {
  PluginDataState,
  ProcessResult,
  type PluginQuery,
} from '@repo/contracts/plugins/argo-calls';
import type { PluginReply } from '../protocol/runtime';
import type { StateRequest } from '../services/plugin-calls';
import type { QueryOwner, QueryServices } from './query-types';

function requestOf(query: PluginQuery): StateRequest {
  if (query.api === 'storage') return query;

  if (query.api === 'fetch') return { api: 'fetch', call: query };

  return processRequest(query);
}

// Naming the member keeps the last branch honest: a new Query api lands here as a type error, not as a process call.
const processRequest = (
  query: Extract<PluginQuery, { api: 'process' }>,
): StateRequest => ({ api: 'process', call: query });

export async function readQuery(
  owner: QueryOwner,
  services: QueryServices,
): Promise<PluginReply> {
  const reply = await services.during(() =>
    services.services.handle(owner.pluginId, owner.generation, {
      ...requestOf(owner.query),
      query: true,
      projectId: owner.projectId,
    }),
  );

  if (timedOut(owner.query, reply))
    return { ok: false, error: 'Argo Query timed out' };

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

export function backgroundRefusal(
  background: boolean,
  reply: PluginReply,
): boolean {
  if (!background) return false;

  if (reply.ok) return false;

  return reply.refused === true;
}
