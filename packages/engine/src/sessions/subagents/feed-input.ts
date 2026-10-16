import { feedRow } from '@repo/db/schema';
import { and, eq, max } from 'drizzle-orm';
import {
  readQueuedFeed,
  readQueuedFeedRow,
  readWrittenRow,
  type FeedInput,
  hydrateStoredFeedRow,
  newestRows,
  storedFeedColumns,
} from '../../feed';
import type { SubagentRouting } from './routing-types';

const highestPosition = (input: SubagentRouting, sessionId: string): number =>
  input.database
    .select({ value: max(feedRow.position) })
    .from(feedRow)
    .where(eq(feedRow.sessionId, sessionId))
    .get()?.value ?? -1;

const writtenRow =
  (input: SubagentRouting, sessionId: string): FeedInput['findWrittenRow'] =>
  (id) =>
    readWrittenRow({
      database: input.database,
      sessionId,
      id,
      pending: readQueuedFeedRow(input.writer, { sessionId, id }),
    });

export function childFeedInput(
  input: SubagentRouting,
  identity: { sessionId: string; epoch: number; maxRevision: number },
): FeedInput {
  return {
    ...identity,
    rows: openChildRows(input, identity.sessionId),
    ...feedServices(input, identity.sessionId),
    ...feedPosition(input, identity),
  };
}

function feedPosition(
  input: SubagentRouting,
  identity: { sessionId: string; maxRevision: number },
): Pick<FeedInput, 'maxRevision' | 'nextPosition'> {
  const pending = readQueuedFeed(input.writer, identity.sessionId);

  return {
    maxRevision: Math.max(identity.maxRevision, pending.maxRevision),
    nextPosition: nextPosition(
      input,
      identity.sessionId,
      pending.highestPosition,
    ),
  };
}

const feedServices = (
  input: SubagentRouting,
  sessionId: string,
): Pick<
  FeedInput,
  'now' | 'createId' | 'findWrittenRow' | 'storageFailing'
> => ({
  now: input.now,
  createId: input.createId,
  findWrittenRow: writtenRow(input, sessionId),
  storageFailing: input.storageFailing,
});

const nextPosition = (
  input: SubagentRouting,
  sessionId: string,
  queued: number,
): number => Math.max(highestPosition(input, sessionId), queued) + 1;

const storedOpenRows = (
  input: SubagentRouting,
  sessionId: string,
): NonNullable<FeedInput['rows']>[string][] =>
  input.database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(and(eq(feedRow.sessionId, sessionId), eq(feedRow.state, 'open')))
    .all()
    .map((row) => hydrateStoredFeedRow(sessionId, row));

function openChildRows(
  input: SubagentRouting,
  sessionId: string,
): NonNullable<FeedInput['rows']> {
  const rows = newestRows([
    ...storedOpenRows(input, sessionId),
    ...readQueuedFeed(input.writer, sessionId).rows,
  ]);

  return Object.fromEntries(
    [...rows].filter(([, row]) => row.state === 'open'),
  );
}
