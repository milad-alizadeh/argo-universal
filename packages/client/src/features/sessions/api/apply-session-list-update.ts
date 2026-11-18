import {
  type SessionInfo,
  SessionListInput,
  type SessionListOutput,
  type SessionListUpdate,
} from '@repo/contracts';
import type {
  InfiniteData,
  Query,
  QueryClient,
  QueryFilters,
} from '@tanstack/react-query';
import { z } from 'zod';

type ListPages = InfiniteData<SessionListOutput, unknown>;

type Outcome = 'asks' | 'placed' | 'unaffected';

const keyedInput = z.object({ input: SessionListInput });

/*
 * Applies a live update to the pages the list already holds, and says whether the Server must be asked again.
 * A changed row the list already shows is replaced where it sits, so a Session streaming for a minute costs no request.
 * Everything else asks again: a Session new to a list, one that joined or left it by its title, Project or archive state, and one removed.
 * Pages order by creation, which no update changes, so a row older than the last loaded page is not in the list yet and asks nothing.
 */
export function applySessionListUpdate(
  client: QueryClient,
  list: QueryFilters,
  update: SessionListUpdate,
): boolean {
  if (update.type === 'removed') return true;

  return client
    .getQueryCache()
    .findAll(list)
    .map((query): Outcome => applyToQuery(client, query, update.session))
    .includes('asks');
}

function applyToQuery(
  client: QueryClient,
  query: Query,
  session: SessionInfo,
): Outcome {
  const data = client.getQueryData<ListPages | SessionListOutput>(
    query.queryKey,
  );

  if (!data) return 'unaffected';

  // Plugin Session rows also read this procedure, as an ordinary query without pages.
  if (!('pages' in data)) return 'asks';

  return applyToPages(client, { query, data }, session);
}

function applyToPages(
  client: QueryClient,
  { query, data }: { query: Query; data: ListPages },
  session: SessionInfo,
): Outcome {
  const outcome = outcomeFor(data, session, inputOf(query));

  if (outcome === 'placed')
    client.setQueryData(query.queryKey, replaced(data, session));

  return outcome;
}

function inputOf(query: Query): SessionListInput {
  return keyedInput.safeParse(query.queryKey[1]).data?.input ?? {};
}

function outcomeFor(
  data: ListPages,
  session: SessionInfo,
  input: SessionListInput,
): Outcome {
  const shown = isShown(data, session);

  return matches(session, input)
    ? matchedOutcome(data, session, shown)
    : leftOutcome(shown);
}

// A row the list's filters no longer let in leaves it, which only a fresh read can say where.
function leftOutcome(shown: boolean): Outcome {
  return shown ? 'asks' : 'unaffected';
}

function matchedOutcome(
  data: ListPages,
  session: SessionInfo,
  shown: boolean,
): Outcome {
  if (shown) return 'placed';

  return isLoaded(data, session) ? 'asks' : 'unaffected';
}

function isShown(data: ListPages, session: SessionInfo): boolean {
  return data.pages.some((page): boolean =>
    page.sessions.some((row): boolean => row.sessionId === session.sessionId),
  );
}

function replaced(data: ListPages, session: SessionInfo): ListPages {
  return {
    ...data,
    pages: data.pages.map((page): SessionListOutput => ({
      ...page,
      sessions: page.sessions.map((row): SessionInfo =>
        row.sessionId === session.sessionId ? session : row,
      ),
    })),
  };
}

// Whether the list would show the row among the pages loaded: every page is loaded, or it sorts at or before the last row loaded.
function isLoaded(data: ListPages, session: SessionInfo): boolean {
  const last = data.pages.at(-1);

  return !last?.nextCursor || sortsBefore(session, last.sessions.at(-1));
}

function sortsBefore(
  session: SessionInfo,
  end: SessionInfo | undefined,
): boolean {
  return end === undefined || creationOrder(session, end) > 0;
}

// Newest created first, as the Server pages, so a later creation sorts before; ties break by the higher id.
function creationOrder(session: SessionInfo, end: SessionInfo): number {
  return (
    session.createdAt - end.createdAt ||
    (session.sessionId > end.sessionId ? 1 : -1)
  );
}

type Filter = (session: SessionInfo, input: SessionListInput) => boolean;

// The Server's own filters, which the list applies to a row before it pages.
const filters: readonly Filter[] = [
  (session, { projectId }): boolean =>
    projectId === undefined || session.projectId === projectId,
  (session, { sessionId }): boolean =>
    sessionId === undefined || session.sessionId === sessionId,
  (session, { archived }): boolean =>
    archived === undefined || (session.archivedAt !== null) === archived,
  (session, { query }): boolean =>
    query === undefined ||
    session.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
];

function matches(session: SessionInfo, input: SessionListInput): boolean {
  return filters.every((filter): boolean => filter(session, input));
}
