import { feedRow } from '@repo/db/schema';
import { eq, max } from 'drizzle-orm';
import {
  readQueuedFeed,
  readQueuedFeedRow,
  readWrittenRow,
  type FeedInput,
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
  const pending = readQueuedFeed(input.writer, identity.sessionId);

  return {
    ...identity,
    ...feedServices(input, identity.sessionId),
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
