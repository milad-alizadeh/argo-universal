import type { Database } from '@repo/db';
import { turn, session } from '@repo/db/schema';
import { and, desc, eq, inArray, notInArray, sql, type SQL } from 'drizzle-orm';
import {
  alias,
  type SQLiteAsyncSelectBase,
  type SQLiteSelectWithout,
} from 'drizzle-orm/sqlite-core';

type LatestTurnIdsQuery = SQLiteSelectWithout<
  SQLiteAsyncSelectBase<
    'session',
    'sync',
    ReturnType<Database['run']>,
    { id: SQL<string> },
    'partial'
  >,
  false,
  'where'
>;

type LatestTurnInput = {
  database: Database;
  updates: string[];
  sessionIds: string[];
  running: boolean;
};

// The id of each Session's latest stored Turn, or its latest running one, as a subquery; `updates` are Turns read apart.
export function readLatestTurnIds(input: LatestTurnInput): LatestTurnIdsQuery {
  const candidate = alias(turn, 'candidate_turn');

  const latest = latestTurn(input, candidate);

  return input.database
    .select({ id: latest })
    .from(session)
    .where(inArray(session.id, input.sessionIds));
}

function latestTurn(
  input: LatestTurnInput,
  candidate: ReturnType<typeof candidateTurn>,
): SQL<string> {
  const query = input.database
    .select({ id: candidate.id })
    .from(candidate)
    .where(candidateFilter(input, candidate))
    .orderBy(desc(candidate.startedAt), desc(candidate.id))
    .limit(1);

  return sql<string>`(${query})`;
}

function candidateTurn(): ReturnType<
  typeof alias<typeof turn, 'candidate_turn'>
> {
  return alias(turn, 'candidate_turn');
}

function candidateFilter(
  input: LatestTurnInput,
  candidate: ReturnType<typeof candidateTurn>,
): SQL | undefined {
  return and(
    eq(candidate.sessionId, session.id),
    input.running ? eq(candidate.status, 'running') : undefined,
    input.updates.length ? notInArray(candidate.id, input.updates) : undefined,
  );
}
