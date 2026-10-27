import {
  readQueuedFeedRow,
  readUnaddressedPlan,
  readWrittenRow,
  type FeedInput,
} from '../feed';
import { readDefaultChangesSummary } from './changes-summary';
import type { SessionContext } from './session-context';

// The Session's own Feed starts from the opened Session's stored position and reads back through its database and Writer.
export const sessionFeedInput = (
  context: SessionContext,
  storageFailing: () => void,
): FeedInput => {
  const { database, writer, now, createId } = context.input;
  const { sessionId } = context;

  return {
    sessionId,
    epoch: context.epoch,
    maxRevision: context.maxRevision,
    activityAt: context.activityAt,
    nextPosition: context.nextPosition,
    now,
    createId,
    refreshChanges: () =>
      readDefaultChangesSummary(
        database,
        context.projectId,
        context.checkout.path,
      ),
    findWrittenRow: (id): ReturnType<typeof readWrittenRow> =>
      readWrittenRow({
        database,
        pending: readQueuedFeedRow(writer, { sessionId, id }),
        sessionId,
        id,
      }),
    storageFailing,
    findUnaddressedPlan: (
      acpSessionId,
    ): ReturnType<typeof readUnaddressedPlan> =>
      readUnaddressedPlan({ database, writer, sessionId, acpSessionId }),
  };
};
