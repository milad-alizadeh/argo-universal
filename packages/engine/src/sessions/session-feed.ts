import { readChangesSummary } from '@repo/git';
import {
  readQueuedFeedRow,
  readUnaddressedPlan,
  readWrittenRow,
  type FeedInput,
} from '../feed';
import { sessionChangesSelection } from './changes-selection';
import { storeSessionChanges } from './session-changes';
import type { SessionContext } from './session-context';

type FeedPosition = Pick<
  FeedInput,
  'sessionId' | 'epoch' | 'maxRevision' | 'activityAt' | 'nextPosition'
>;

const feedPosition = (context: SessionContext): FeedPosition => ({
  sessionId: context.sessionId,
  epoch: context.epoch,
  maxRevision: context.maxRevision,
  activityAt: context.activityAt,
  nextPosition: context.nextPosition,
});

const findWrittenRow = (
  context: SessionContext,
  id: string,
): ReturnType<typeof readWrittenRow> => {
  const { database, writer } = context.input;
  const { sessionId } = context;

  return readWrittenRow({
    database,
    pending: readQueuedFeedRow(writer, { sessionId, id }),
    sessionId,
    id,
  });
};

const findUnaddressedPlan = (
  context: SessionContext,
  acpSessionId: string,
): ReturnType<typeof readUnaddressedPlan> =>
  readUnaddressedPlan({
    database: context.input.database,
    writer: context.input.writer,
    sessionId: context.sessionId,
    acpSessionId,
  });

// Reads the Checkout totals and stores them for the Session list.
const refreshChanges = async (
  context: SessionContext,
): ReturnType<typeof readChangesSummary> => {
  const { database, writer } = context.input;

  const changes = await readChangesSummary(
    sessionChangesSelection(database, context),
  );

  storeSessionChanges({ database, writer }, context.sessionId, changes);

  return changes;
};

// The Session's Feed reads stored and queued rows from its opened position.
export const sessionFeedInput = (
  context: SessionContext,
  storageFailing: () => void,
): FeedInput => ({
  ...feedPosition(context),
  now: context.input.now,
  createId: context.input.createId,
  refreshChanges: () => refreshChanges(context),
  findWrittenRow: (id) => findWrittenRow(context, id),
  findUnaddressedPlan: (acpSessionId) =>
    findUnaddressedPlan(context, acpSessionId),
  storageFailing,
});
