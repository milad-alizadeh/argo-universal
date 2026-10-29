import { readChangesSummary } from '@repo/git';
import {
  readQueuedFeedRow,
  readUnaddressedPlan,
  readWrittenRow,
  type FeedInput,
} from '../feed';
import { sessionChangesSelection } from './changes-selection';
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

const refreshChanges = (
  context: SessionContext,
): ReturnType<typeof readChangesSummary> =>
  readChangesSummary(sessionChangesSelection(context.input.database, context));

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
