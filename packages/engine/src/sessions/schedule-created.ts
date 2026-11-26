import type { WriterJob } from '../storage';
import { writeScheduleNotice } from './schedule-skip';
import { markSessionSeen } from './session-seen';
import type { SessionHandlerSources } from './session-sources';

export const scheduleCreatedNoticeSuffix = ':schedule-created';

// Saving a task Schedule writes this notice; it is seen as written, so only a run that ends marks the Session Unread.
export function scheduleCreatedNotice(
  sources: SessionHandlerSources,
  created: { sessionId: string; instructions: string },
): (advance: WriterJob) => Promise<void> {
  const { sessionId, instructions } = created;

  return async (advance) => {
    await writeScheduleNotice(sources, {
      sessionId,
      advance,
      notice: {
        id: sessionId + scheduleCreatedNoticeSuffix,
        sessionUpdate: 'notice',
        state: 'settled',
        severity: 'info',
        title: 'Schedule created',
        description: instructions,
      },
    });
    await markSessionSeen(sources, {
      sessionId,
      revision: sources.readSession(sessionId).maxRevision,
    });
  };
}
