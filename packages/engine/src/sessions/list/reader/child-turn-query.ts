import type { Database } from '@repo/db';
import { turn, session } from '@repo/db/schema';
import { and, desc, eq, inArray, notInArray, sql, type SQL } from 'drizzle-orm';
import {
  alias,
  type SQLiteAsyncSelectBase,
  type SQLiteSelectWithout,
} from 'drizzle-orm/sqlite-core';

type ChildTurnIdsQuery = SQLiteSelectWithout<
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

type ChildTurnInput = {
  database: Database;
  updates: string[];
  children: string[];
  running: boolean;
};

export function readChildTurnIds(input: {
  database: Database;
  updates: string[];
  children: string[];
  running: boolean;
}): ChildTurnIdsQuery {
  const candidate = alias(turn, 'candidate_turn');

  const latest = latestChildTurn(input, candidate);

  return input.database
    .select({ id: latest })
    .from(session)
    .where(inArray(session.id, input.children));
}

function latestChildTurn(
  input: ChildTurnInput,
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
  input: ChildTurnInput,
  candidate: ReturnType<typeof candidateTurn>,
): SQL | undefined {
  return and(
    eq(candidate.sessionId, session.id),
    input.running ? eq(candidate.status, 'running') : undefined,
    input.updates.length ? notInArray(candidate.id, input.updates) : undefined,
  );
}
