import {
  pagedListRead,
  type PluginDataRequest,
  type PluginDataState,
  type PluginQuery,
} from '@repo/contracts/plugins/argo-calls';
import type { PluginSurface } from '@repo/contracts/plugins/kit';
import type { PageState } from '@repo/contracts/plugins/page-address';
import type { QueryResult } from '@repo/contracts/plugins/query-results';
import type { WireJson } from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import type { ReadPage } from './paged-lists';
import { queryResult } from './query-result';

// The worker's read of one Query through the Server's cache (ADR-0037).
export type DataCall = (request: PluginDataRequest) => Promise<PluginDataState>;

// A Loader's reads during one draw: the answer Argo keeps for the Query, or why it has none.
export type DrawReader = <Query extends PluginQuery>(
  query: Query,
  fresh: boolean,
) => Promise<QueryResult<Query>>;

// The Server holds each read by the draw the Loader runs for.
export const drawReader =
  (call: DataCall): DrawReader =>
  (query, fresh) =>
    readQuery(call, query, fresh);

async function readQuery<Query extends PluginQuery>(
  call: DataCall,
  query: Query,
  fresh: boolean,
): Promise<QueryResult<Query>>;
async function readQuery(
  call: DataCall,
  query: PluginQuery,
  fresh: boolean,
): Promise<QueryResult<PluginQuery>> {
  const state = await call({ api: 'data', action: 'read', query, fresh });

  if (state.data === undefined)
    throw new Error(state.error ?? 'The Query answered nothing');

  return queryResult(query.api, state.data);
}

// The address a list is read at, short of its Plugin and Project, which the Query's entry already names.
type ListAt = {
  path: string;
  pageState: PageState;
  sessionId?: string;
  serverDevice?: boolean;
  surface?: PluginSurface;
};

const listPage = <Item>(): z.ZodType<{
  items: Item[];
  cursor: string | null;
}> =>
  z.object({
    items: z.array(z.custom<Item>()),
    cursor: z.string().nullable(),
  });

const listArgs = (
  { path, pageState, sessionId, serverDevice, surface }: ListAt,
  cursor: string | null,
): WireJson => ({
  path,
  pageState,
  sessionId: sessionId ?? null,
  serverDevice: serverDevice === true,
  surface: surface ?? null,
  cursor,
});

/*
 * One page of the draw's paged list, kept by Argo as a Query of its address and cursor. The list sees the
 * App's surface and whether it is the Server Device, so they are part of what the page is kept under.
 */
export function listReader<Item>(read: DrawReader, at: ListAt): ReadPage<Item> {
  const page = listPage<Item>();

  return async (cursor, fresh) =>
    page.parse(
      await read(
        { api: 'read', name: pagedListRead, args: listArgs(at, cursor) },
        fresh,
      ),
    );
}
