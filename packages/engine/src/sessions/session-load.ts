import {
  InitialConfigOption,
  TurnError,
  type SessionRecord,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, turn } from '@repo/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  highestFeedPosition,
  interruptionDisclosureId,
  readQueuedFeed,
} from '../feed';
import type { WriterActorRef } from '../storage';
import type { SessionData, SessionInput } from './session-data';
import { readSessionRow } from './session-record';

const storedConfigValues = z.array(InitialConfigOption);

const readLatestTurn = (
  database: Database,
  sessionId: string,
): { id: string; error: unknown } | undefined =>
  database
    .select({ id: turn.id, error: turn.error })
    .from(turn)
    .where(eq(turn.sessionId, sessionId))
    .orderBy(desc(turn.startedAt))
    .limit(1)
    .get();

const hasFeedRow = (
  database: Database,
  sessionId: string,
  id: string,
): boolean =>
  database
    .select({ id: feedRow.id })
    .from(feedRow)
    .where(and(eq(feedRow.sessionId, sessionId), eq(feedRow.id, id)))
    .get() !== undefined;

type LatestTurn = NonNullable<ReturnType<typeof readLatestTurn>>;

const isInterrupted = (latest: LatestTurn): boolean =>
  TurnError.safeParse(latest.error).data?.code === 'interrupted';

const shouldDisclose = (
  database: Database,
  sessionId: string,
  latest: LatestTurn,
): boolean =>
  isInterrupted(latest) &&
  !hasFeedRow(database, sessionId, interruptionDisclosureId(latest.id));

const readUndisclosedInterruption = (
  database: Database,
  sessionId: string,
): string | null => {
  const latest = readLatestTurn(database, sessionId);

  if (!latest) return null;

  return shouldDisclose(database, sessionId, latest) ? latest.id : null;
};

const interruptionFor = (input: SessionInput): string | null =>
  readUndisclosedInterruption(input.database, input.sessionId);

type StoredValues = Omit<
  SessionData,
  'nextPosition' | 'kept' | 'undisclosedInterruptedTurnId'
>;

const storedValues = (row: SessionRecord): StoredValues => ({
  sessionId: row.id,
  projectId: row.projectId,
  agent: row.agent,
  vendorSessionId: row.vendorSessionId,
  checkout: { path: row.checkoutPath, branch: row.checkoutBranch },
  configValues: storedConfigValues.parse(row.configValues),
  heldConfig: storedConfigValues.parse(row.heldConfig),
  epoch: row.epoch,
  maxRevision: row.maxRevision,
  activityAt: row.activityAt,
});

function nextPosition(
  input: SessionInput,
  writer: WriterActorRef | undefined,
): number {
  const pendingFeed = readQueuedFeed(writer, input.sessionId);
  const position = highestFeedPosition(input.database, input.sessionId);

  return Math.max(position, pendingFeed.highestPosition) + 1;
}

function requireStoredSession(
  input: SessionInput,
  writer: WriterActorRef | undefined,
): SessionRecord {
  const row = readSessionRow(
    { database: input.database, writer },
    input.sessionId,
  );

  if (!row) throw new Error(`No Session ${input.sessionId}`);

  return row;
}

export async function loadSession(
  input: SessionInput,
  writer?: WriterActorRef,
): Promise<SessionData> {
  const row = requireStoredSession(input, writer);
  const position = nextPosition(input, writer);

  return {
    ...storedValues(row),
    nextPosition: position,
    kept: true,
    undisclosedInterruptedTurnId: interruptionFor(input),
  };
}
