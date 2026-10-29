import { Turn } from '@repo/contracts';
import { turn } from '@repo/db/schema';
import { and, desc, eq, inArray, notInArray, or } from 'drizzle-orm';
import { readQueuedSessionRows } from '../../session-storage/session-storage';
import { storedTurnColumns } from '../../turns';
import { decodeStoredTurn, readLatestTurnIds } from '../../turns';
import type { ListReadInput } from './input';

type FamilyUpdates = { children: string[]; updates: string[] };

export function readListTurns(
  input: ListReadInput,
  sessionId: string,
  children: string[],
): Turn[] {
  const projection = readQueuedSessionRows(input.writer);
  const updates = projection.changedTurnIds();
  const rows = storedTurns(input, sessionId, { children, updates });
  const ids = new Set([sessionId, ...children]);

  return projection
    .turns(rows.flatMap((row): Turn[] => parseTurn(input, row, true)))
    .filter((row): boolean => ids.has(row.sessionId))
    .flatMap((row): Turn[] => parseTurn(input, row, false));
}

function parseTurn(
  input: ListReadInput,
  row: typeof turn.$inferSelect | Turn,
  stored: boolean,
): Turn[] {
  const parsed = input.validate((): Turn => parseTurnRow(row, stored));

  if (!parsed) input.rejectedSessions.add(row.sessionId);

  return parsed ? [parsed] : [];
}

function storedTurns(
  input: ListReadInput,
  sessionId: string,
  { children, updates }: FamilyUpdates,
): (typeof turn.$inferSelect)[] {
  return [
    ...rootTurns(input, sessionId, updates),
    ...childTurns(input, children, updates),
    ...changedTurns(input, sessionId, { children, updates }),
  ];
}

function childTurns(
  input: ListReadInput,
  children: string[],
  updates: string[],
): (typeof turn.$inferSelect)[] {
  if (!children.length) return [];

  const runningIds = childIds(input, { children, updates }, true);
  const latestIds = childIds(input, { children, updates }, false);

  return input.database
    .select(storedTurnColumns)
    .from(turn)
    .where(or(inArray(turn.id, runningIds), inArray(turn.id, latestIds)))
    .all();
}

function changedTurns(
  input: ListReadInput,
  sessionId: string,
  { children, updates }: FamilyUpdates,
): (typeof turn.$inferSelect)[] {
  if (!updates.length) return [];

  return input.database
    .select(storedTurnColumns)
    .from(turn)
    .where(changedTurnFilter(sessionId, children, updates))
    .all();
}

function parseTurnRow(
  row: typeof turn.$inferSelect | Turn,
  stored: boolean,
): Turn {
  return stored ? decodeStoredTurn(row) : Turn.parse(row);
}

function rootTurns(
  input: ListReadInput,
  sessionId: string,
  updates: string[],
): (typeof turn.$inferSelect)[] {
  return input.database
    .select(storedTurnColumns)
    .from(turn)
    .where(rootTurnFilter(sessionId, updates))
    .orderBy(desc(turn.startedAt), desc(turn.id))
    .limit(1)
    .all();
}

function childIds(
  input: ListReadInput,
  { children, updates }: FamilyUpdates,
  running: boolean,
): ReturnType<typeof readLatestTurnIds> {
  return readLatestTurnIds({
    database: input.database,
    sessionIds: children,
    updates,
    running,
  });
}

function changedTurnFilter(
  sessionId: string,
  children: string[],
  updates: string[],
): ReturnType<typeof and> {
  return and(
    inArray(turn.sessionId, [sessionId, ...children]),
    inArray(turn.id, updates),
  );
}

function rootTurnFilter(
  sessionId: string,
  updates: string[],
): ReturnType<typeof and> {
  return and(
    eq(turn.sessionId, sessionId),
    updates.length ? notInArray(turn.id, updates) : undefined,
  );
}
